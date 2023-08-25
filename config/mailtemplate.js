const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'maulik.paghadal3301@gmail.com',
    pass: 'tvootfukuylybrra'    // Use your app password here
  }
});
/*<span class="logo-title">MT4</span>
    <p>${emailText}</p>*/
// const rows = emailText.name.map((name, index) => {
//   return `
//     <tr>
//       <td><strong>${name}</strong></td>
//       <td>${emailText.paths[index]}</td>
//     </tr>
//   `;
// });
const createHtmlTemplate = (emailText) => {
  return `
   <!DOCTYPE html>
   <html>
   <head>
     <meta charset="utf-8">
     <meta name="viewport" content="width=device-width, initial-scale=1.0">
     <link href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,400;0,700&display=swap" rel="stylesheet">
     <style>
      body {
        font-family: 'Poppins', sans-serif;
          background-color: #f1f1f1;
      }
     </style>
   </head>
   <body>
        ${emailText}
   </body>
   </html>
  `;
};
const recipients = ['maulik@resolutesolutions.in'];
const sendEmail = async (emailSubject, emailText) => {
  try {
    const info = await transporter.sendMail({
      from: 'maulik.paghadal3301@gmail.com',
      to: recipients,
      // to: to.join(','),
      subject: emailSubject,
      text: '',
      html: createHtmlTemplate(emailText),
    });

    console.log("Message sent: %s", info.response);
    return true; // Email sent successfully

  } catch (error) {
    console.error("Error sending email:", error);
    return false; // Email sending failed
  }
};



module.exports = { sendEmail }
