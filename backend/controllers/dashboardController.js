const Lead = require('../models/Lead');
const Client = require('../models/Client');
const Diagnostic = require('../models/Diagnostic');
const Newsletter = require('../models/Newsletter');
const Notification = require('../models/Notification');
const User = require('../models/User');

// GET /api/dashboard/stats
exports.getStats = async (req, res) => {
  try {
    const now   = new Date();
    const month = new Date(now.getFullYear(), now.getMonth(), 1);
    const prev  = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      totalLeads, newLeadsThisMonth, newLeadsPrev,
      openDeals, closedWon, totalRevenue,
      activeClients, newSubscribers, totalDiagnostics, pendingDiagnostics,
    ] = await Promise.all([
      Lead.countDocuments({ isArchived: false }),
      Lead.countDocuments({ createdAt: { $gte: month }, isArchived: false }),
      Lead.countDocuments({ createdAt: { $gte: prev, $lt: month }, isArchived: false }),
      Lead.countDocuments({ stage: { $in: ['new', 'contacted', 'qualified', 'proposal_sent', 'negotiation'] }, isArchived: false }),
      Lead.countDocuments({ stage: 'won' }),
      Lead.aggregate([{ $match: { stage: 'won' } }, { $group: { _id: null, total: { $sum: '$value' } } }]),
      Client.countDocuments({ status: 'active' }),
      Newsletter.countDocuments({ createdAt: { $gte: month }, isActive: true }),
      Diagnostic.countDocuments({}),
      Diagnostic.countDocuments({ status: { $in: ['pending', 'processing'] } }),
    ]);

    const revenue = totalRevenue[0]?.total || 0;

    // Pipeline by stage
    const pipelineByStage = await Lead.aggregate([
      { $match: { isArchived: false } },
      { $group: { _id: '$stage', count: { $sum: 1 }, value: { $sum: '$value' } } },
    ]);

    // Revenue by country (won deals)
    const revenueByCountry = await Lead.aggregate([
      { $match: { stage: 'won', country: { $ne: null } } },
      { $group: { _id: '$country', revenue: { $sum: '$value' }, count: { $sum: 1 } } },
      { $sort: { revenue: -1 } },
      { $limit: 8 },
    ]);

    // Monthly leads for last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    const monthlyLeads = await Lead.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo }, isArchived: false } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 },
          won:   { $sum: { $cond: [{ $eq: ['$stage', 'won'] }, 1, 0] } },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Team performance
    const teamPerformance = await Lead.aggregate([
      { $match: { assignedTo: { $ne: null } } },
      {
        $group: {
          _id: '$assignedTo',
          total: { $sum: 1 },
          won:   { $sum: { $cond: [{ $eq: ['$stage', 'won'] }, 1, 0] } },
          lost:  { $sum: { $cond: [{ $eq: ['$stage', 'lost'] }, 1, 0] } },
          revenue: { $sum: { $cond: [{ $eq: ['$stage', 'won'] }, '$value', 0] } },
        },
      },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      {
        $project: {
          name:     '$user.name',
          initials: '$user.initials',
          total: 1, won: 1, lost: 1, revenue: 1,
          conversionRate: {
            $cond: [
              { $eq: ['$total', 0] }, 0,
              { $multiply: [{ $divide: ['$won', '$total'] }, 100] },
            ],
          },
        },
      },
      { $sort: { revenue: -1 } },
    ]);

    // Lead growth %
    const leadGrowth = newLeadsPrev > 0
      ? Math.round(((newLeadsThisMonth - newLeadsPrev) / newLeadsPrev) * 100)
      : newLeadsThisMonth > 0 ? 100 : 0;

    res.json({
      success: true,
      stats: {
        totalLeads,
        newLeadsThisMonth,
        leadGrowth,
        openDeals,
        closedWon,
        totalRevenue: revenue,
        activeClients,
        newSubscribers,
        totalDiagnostics,
        pendingDiagnostics,
      },
      charts: {
        pipelineByStage,
        revenueByCountry,
        monthlyLeads,
        teamPerformance,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/dashboard/notifications
exports.getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;
    const filter = {};
    if (unreadOnly === 'true') filter.isRead = false;

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({ isRead: false });
    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({ success: true, total, unreadCount, page: parseInt(page), notifications });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/dashboard/notifications/read-all
exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ isRead: false }, { isRead: true });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/dashboard/notifications/:id/read
exports.markOneRead = async (req, res) => {
  try {
    const notif = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );
    if (!notif) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.json({ success: true, notification: notif });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
