'use strict';
const NewsletterService = require('../services/NewsletterService');
const { successResponse, errorResponse } = require('../utils/responseFormatter');

// The website calls subscribe through its server, which forwards the visitor IP in X-Forwarded-For.
const visitorIp = (req) => String(req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim();

const fail = (res, error, fallback) => {
  if (error instanceof NewsletterService.ValidationError) return errorResponse(res, error.message, error.errors, 422);
  console.error(fallback, error);
  return errorResponse(res, fallback, [], 500);
};

const NewsletterController = {
  /** Public: POST /newsletter/subscribe { email, name?, source?, _hp } */
  async subscribe(req, res) {
    try {
      const result = await NewsletterService.subscribe(req.body || {}, visitorIp(req));
      const message = result.already ? 'You are already subscribed. Thank you!' : 'Thank you for subscribing!';
      return successResponse(res, message, { subscribed: true }, null, result.created ? 201 : 200);
    } catch (error) {
      return fail(res, error, 'Unable to subscribe right now. Please try again later.');
    }
  },

  async list(req, res) {
    try {
      const { rows, counts, pagination } = await NewsletterService.list(req.query);
      return res.status(200).json({ success: true, message: 'Newsletter subscribers', data: rows, counts, pagination, errors: [] });
    } catch (error) {
      return fail(res, error, 'Unable to load newsletter subscribers.');
    }
  },

  async exportCsv(req, res) {
    try {
      const csv = await NewsletterService.exportCsv(req.query);
      const day = new Date().toISOString().slice(0, 10);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="newsletter-subscribers-${day}.csv"`);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).send(csv);
    } catch (error) {
      return fail(res, error, 'Unable to export newsletter subscribers.');
    }
  },

  async setStatus(req, res) {
    try {
      const row = await NewsletterService.setStatus(req.params.id, req.body?.status);
      if (!row) return errorResponse(res, 'Subscriber not found.', [], 404);
      return successResponse(res, 'Subscriber updated.', row);
    } catch (error) {
      return fail(res, error, 'Unable to update the subscriber.');
    }
  },

  async remove(req, res) {
    try {
      const count = await NewsletterService.remove(req.params.id);
      if (!count) return errorResponse(res, 'Subscriber not found.', [], 404);
      return successResponse(res, 'Subscriber deleted.', { id: req.params.id });
    } catch (error) {
      return fail(res, error, 'Unable to delete the subscriber.');
    }
  },
};

module.exports = NewsletterController;
