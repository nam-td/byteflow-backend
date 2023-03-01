const nodemailer = require("nodemailer");

module.exports = async (email, subject, text) => {
    try{
        const transporter = nodemailer.createTransport({
            service: process.env.SERVICE,
            // secure: Boolean(process.env.SECURE),
            secure: false,
            auth: {
                user: process.env.USER,
                pass: process.env.PASS
            },
            tls: {
                ciphers:'SSLv3'
            }
        });

        await transporter.sendMail ({
            from: process.env.SENDER,
            to: email,
            subject: subject,
            text: text
        });

        console.log("Email sent successfully!");

    } catch(error){
        console.log("Email isn't sent!");
        console.log(error)
    }
}