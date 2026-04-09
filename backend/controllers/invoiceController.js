const Invoice = require('../models/Invoice');
const { sendEmail, invoiceEmail } = require('../utils/email');

// GET /api/invoices (protected)
exports.getInvoices = async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Invoice.countDocuments(filter);
    const invoices = await Invoice.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    res.json({ success: true, total, page: parseInt(page), invoices });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/invoices/:id (protected)
exports.getInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, invoice });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/invoices (protected)
exports.createInvoice = async (req, res) => {
  try {
    const { client, items, taxRate, currency, dueDate, notes } = req.body;
    if (!client?.name || !client?.email) {
      return res.status(400).json({ success: false, message: 'Client name and email are required.' });
    }
    if (!items || !items.length) {
      return res.status(400).json({ success: false, message: 'At least one line item is required.' });
    }

    const processedItems = items.map(i => ({
      description: i.description,
      quantity:    Number(i.quantity),
      unitPrice:   Number(i.unitPrice),
      amount:      Number(i.quantity) * Number(i.unitPrice),
    }));

    const subtotal  = processedItems.reduce((s, i) => s + i.amount, 0);
    const tax       = (taxRate || 0) / 100;
    const taxAmount = subtotal * tax;
    const total     = subtotal + taxAmount;

    const invoice = await Invoice.create({
      client,
      items:     processedItems,
      subtotal,
      taxRate:   taxRate || 0,
      taxAmount,
      total,
      currency:  currency || 'USD',
      dueDate:   dueDate ? new Date(dueDate) : undefined,
      notes,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, invoice });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/invoices/:id (protected)
exports.updateInvoice = async (req, res) => {
  try {
    const { items, taxRate } = req.body;
    if (items) {
      const processedItems = items.map(i => ({
        description: i.description,
        quantity:    Number(i.quantity),
        unitPrice:   Number(i.unitPrice),
        amount:      Number(i.quantity) * Number(i.unitPrice),
      }));
      const subtotal  = processedItems.reduce((s, i) => s + i.amount, 0);
      const tax       = (taxRate || req.body.taxRate || 0) / 100;
      const taxAmount = subtotal * tax;
      req.body.items     = processedItems;
      req.body.subtotal  = subtotal;
      req.body.taxAmount = taxAmount;
      req.body.total     = subtotal + taxAmount;
    }

    const invoice = await Invoice.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, invoice });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/invoices/:id/send — send invoice email with PDF attached (base64 from client)
exports.sendInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const { pdfBase64 } = req.body;
    const attachments = pdfBase64 ? [{
      filename:    `Invoice_${invoice.invoiceNumber}.pdf`,
      content:     Buffer.from(pdfBase64, 'base64'),
      contentType: 'application/pdf',
    }] : [];

    const emailOpts = invoiceEmail(invoice);
    const result = await sendEmail({ ...emailOpts, attachments });

    if (result.success) {
      invoice.status = 'sent';
      await invoice.save();
    }

    res.json({ success: result.success, message: result.success ? 'Invoice sent.' : result.error });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/invoices/:id/status (protected)
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['draft','sent','paid','overdue'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }
    const invoice = await Invoice.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, invoice });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/invoices/:id (protected)
exports.deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndDelete(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
