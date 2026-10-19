const nodemailer = require('nodemailer');
const { logger } = require('../config/logger');
const settingRepository = require('../repositories/SettingRepository');

const escapeHtml = (str) => str
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

class MailService {
  async getTransporter() {
    // Fetch dynamic SMTP settings from the database (group: 'smtp')
    const smtpSettings = await settingRepository.getSettingsObject('smtp');

    const host = smtpSettings.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = smtpSettings.smtpPort || process.env.SMTP_PORT || 587;
    const user = smtpSettings.smtpUsername || process.env.SMTP_USER;
    const pass = smtpSettings.smtpPassword || process.env.SMTP_PASS;
    const secure = smtpSettings.smtpSecure !== undefined ? smtpSettings.smtpSecure : (process.env.SMTP_SECURE === 'true');

    return nodemailer.createTransport({
      host: host,
      port: Number(port),
      secure: secure, // true for 465, false for other ports
      auth: {
        user: user,
        pass: pass,
      },
    });
  }

  async sendLeadNotification(rawLeadData) {
    // Lead values come straight from public website forms, so escape them before
    // they are placed into the HTML email body
    const leadData = Object.fromEntries(
      Object.entries(rawLeadData).map(([key, value]) => [key, typeof value === 'string' ? escapeHtml(value) : value])
    );
    const smtpSettings = await settingRepository.getSettingsObject('smtp');
    // Using fromEmail as fallback for adminEmail if not explicitly provided
    const adminEmail = smtpSettings.adminEmail || smtpSettings.fromEmail || process.env.ADMIN_EMAIL;
    const fromEmail = smtpSettings.fromEmail || smtpSettings.smtpUsername || process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@yourdomain.com';

    if (!adminEmail) {
        logger.warn('Admin email is not set in DB settings or .env. Cannot send lead notification.');
        return;
    }

    const transporter = await this.getTransporter();

    const mailOptions = {
      from: fromEmail,
      to: adminEmail,
      subject: `New Lead Generated: ${rawLeadData.subject || 'Website Inquiry'}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #0066bf; color: #ffffff; padding: 20px; text-align: center;">
                <h2 style="margin: 0;">New Lead Received!</h2>
            </div>
            <div style="padding: 20px;">
                <p style="font-size: 16px; color: #333;">A new inquiry has been submitted on the website. Here are the details:</p>
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #eeeeee; font-weight: bold; width: 30%; color: #555;">Name</td>
                        <td style="padding: 10px; border-bottom: 1px solid #eeeeee; color: #222;">${leadData.name}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #eeeeee; font-weight: bold; color: #555;">Email</td>
                        <td style="padding: 10px; border-bottom: 1px solid #eeeeee; color: #0066bf;">
                            <a href="mailto:${leadData.email}" style="color: #0066bf; text-decoration: none;">${leadData.email}</a>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #eeeeee; font-weight: bold; color: #555;">Phone</td>
                        <td style="padding: 10px; border-bottom: 1px solid #eeeeee; color: #222;">${leadData.phone}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #eeeeee; font-weight: bold; color: #555;">Website</td>
                        <td style="padding: 10px; border-bottom: 1px solid #eeeeee; color: #222;">${leadData.website || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #eeeeee; font-weight: bold; color: #555;">Source</td>
                        <td style="padding: 10px; border-bottom: 1px solid #eeeeee; color: #222;">${leadData.source || 'Website'}</td>
                    </tr>
                </table>
                <div style="margin-top: 25px;">
                    <h3 style="color: #555; margin-bottom: 10px;">Message:</h3>
                    <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #0066bf; border-radius: 4px; color: #444; line-height: 1.6;">
                        ${leadData.message ? leadData.message.replace(/\n/g, '<br>') : 'No message provided.'}
                    </div>
                </div>
            </div>
            <div style="background-color: #f5f5f5; color: #888; padding: 15px; text-align: center; font-size: 12px;">
                <p style="margin: 0;">This email was automatically generated from your website's lead capture system.</p>
            </div>
        </div>
      `,
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      logger.info(`Lead notification email sent to ${adminEmail}: ${info.messageId}`);
      return info;
    } catch (error) {
      logger.error(`Error sending lead email: ${error.message}`);
      // Do not throw so that lead saving is not blocked
    }
  }
}

module.exports = new MailService();
