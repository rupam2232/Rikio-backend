import nodemailer from 'nodemailer';

export class NodemailerOpt {
    nodemailer = nodemailer

    constructor() {
        this.transporter = nodemailer.createTransport({
            service: process.env.EMAIL_SERVICE,
            auth: {
                user: process.env.EMAIL,
                pass: process.env.EMAIL_PASSWORD
            }
        })
    }

    async send({ to, subject, html, headers }) {
        try {
            if (!to || !subject || !html) return "null";
            const response = await this.transporter.sendMail({
                from: process.env.EMAIL,
                to,
                subject,
                html,
                headers
            })
            return response;
        } catch (error) {
            return null;
        }

    }

}

const nodemailerOpt = new NodemailerOpt()
export default nodemailerOpt