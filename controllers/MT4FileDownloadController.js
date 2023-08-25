const db = require("../models");
const appregisters = db.appregisters;
const apprunmodel = db.apprunmodel;
const MT4Model = db.MT4Model;
const ProfileFile = db.ProfileFile;
const GlobalvarFile = db.GlobalvarFile;
const profileFolderDownloadReq = db.ProfileFolderDownloadReq;
const globalFileDownloadreq = db.GlobalFileDownloadreq;
var ip = require('ip');
const myip = ip.address();
const fs = require('fs');
const util = require("util");
const os = require("os")
const AdmZip = require('adm-zip');
const fsExtra = require('fs-extra');
const archiver = require("archiver");
const path = require("path");
const pchostname = os.hostname();
const { sendEmail } = require("../config/mailtemplate");
function updateAndLogCurrentDate() {
    const date = new Date(); // Creating new date object
    const options = {
        // Options object for formatting date object
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: true,
    };
    return date.toLocaleString("en-IN", options);
}
updateAndLogCurrentDate();
setInterval(updateAndLogCurrentDate, 1000);
const ProfileFolderdownload = async (req, res) => {
    try {
        const page = req.params.page || 1;
        const limit = 10;
        const offset = (page - 1) * limit;
        const { count, rows: MT4view } = await MT4Model.findAndCountAll({
            attributes: { exclude: ["createdAt", "updatedAt"] },
            offset: offset,
            limit: limit,
        });
        return res.render("Mt4/MT4ProfileFolderDownload", {
            all: MT4view,
            current: page,
            pages: Math.ceil(count / limit),
            user: JSON.stringify(req.user),
        });
    } catch (error) {
        console.log("Error retrieving Data", error);
        req.flash("error", "Error retrieving User");
        return res.redirect("back");
    }
};
const GlobalVarFiledownload = async (req, res) => {
    try {
        const page = req.params.page || 1;
        const limit = 10;
        const offset = (page - 1) * limit;
        const { count, rows: MT4view } = await MT4Model.findAndCountAll({
            attributes: { exclude: ["createdAt", "updatedAt"] },
            offset: offset,
            limit: limit,
        });
        return res.render("Mt4/GlobalVarFileDownload", {
            all: MT4view,
            current: page,
            pages: Math.ceil(count / limit),
            user: JSON.stringify(req.user),
        });
    } catch (error) {
        console.log("Error retrieving Data", error);
        req.flash("error", "Error retrieving User");
        return res.redirect("back");
    }
};
function extractFilesFromZip(zipPath, destinationPath) {
    return new Promise((resolve, reject) => {
        const zip = new AdmZip(zipPath);
        zip.extractAllToAsync(destinationPath, true, (error) => {
            if (error) {
                reject(error);
            } else {
                console.log("Files extracted from the zip folder.");
                resolve();
            }
        });
    });
}
const MT4ProfileBackUp = async (req, res) => {
    try {
        const system_name = req.query.system_name;
        const profile_folder_path = req.query.profile_path;
        const profile_backup_path = req.query.profile_backup_path;

        const existingData = await profileFolderDownloadReq.findOne({
            where: { system_name: system_name, profile_backup_path: profile_backup_path, profile_folder_path: profile_folder_path }
        });

        if (existingData) {
            await profileFolderDownloadReq.update(
                { status: 0 },
                {
                    where: {
                        system_name: system_name,
                        profile_backup_path: profile_backup_path,
                        profile_folder_path: profile_folder_path
                    }
                }
            );
        } else {
            const newApp = await profileFolderDownloadReq.create({
                system_name: system_name,
                profile_folder_path: profile_folder_path,
                profile_backup_path: profile_backup_path
            });
            if (!newApp) {
                console.log(err);
                return res.redirect('back');
            }
        }

        req.flash("success", "Your backup request has been sent successfully.");
        // Send email
        const emailSubject = `Manual Backup for Profiles Folder on Machine ${system_name}`;
        const emailText = `
            Hello Team,<br>
            <br>
                A manual backup for the Profiles Folder was performed on ${updateAndLogCurrentDate()} on Machine ${system_name}. Details:<br>
            <br>
            - Backup Folder Path:: ${profile_backup_path} (Timestamp: ${updateAndLogCurrentDate()})<br>
            <br>
            Thank you!
            `;
        const isEmailSent = await sendEmail(emailSubject, emailText);

        if (isEmailSent) {
            console.log("Email sent successfully.");
        } else {
            console.log("Email sending failed.");
        }

        return res.redirect('back');
    } catch (error) {
        console.log(error);
        return res.redirect('back');
    }
}

// const MT4ProfileBackUp = async (req, res) => {
//     try {
//         const system_name = req.query.system_name;
//         const profile_folder_path = req.query.profile_path;
//         const profile_backup_path = req.query.profile_backup_path;
//         const newApp = await profileFolderDownloadReq.create({ system_name: system_name, profile_folder_path: profile_folder_path, profile_backup_path: profile_backup_path });
//         if (!newApp) {
//             console.log(err);
//             return res.redirect('back');
//         } else {
//             req.flash("success", "Your backup request has been sent successfully.");
//             const emailSubject = `The system's ${system_name} backup request has been sent successfully. `;
//             const name = ["profile_path", "profile_backup_path"];
//             const paths = [profile_folder_path, profile_backup_path];
//             const emailText = { name: name, paths: paths };
//             const isEmailSent = await sendEmail(emailSubject, emailText);
//             if (isEmailSent) {
//                 console.log("Email sent successfully.");
//             } else {
//                 console.log("Email sending failed.");
//             }
//             return res.redirect('back');
//         }
//     } catch (error) {
//         console.log(error);
//         return res.redirect('back');
//     }
// }
// const MT4ProfileBackUp = async (req, res) => {
//     const system_name = req.query.system_name;
//     const profile_folder_path = req.query.profile_path;
//     await ProfileFile.findOne({
//         where: { system_name: system_name, profile_folder_path: profile_folder_path }
//     })
//         .then((data) => {
//             const profile_folder_path = data.profile_folder_path.replace(/\\/g, "/");
//             const profile_backup_path = path.dirname(data.profile_backup_path).replace(/\\/g, "/");
//             const profile_backup_directory = path.join(path.parse(data.profile_backup_path).dir, path.parse(data.profile_backup_path).name);
//             const lastDirectoryName = path.basename(profile_backup_directory + ".zip");
//             const filePath = path.join(profile_backup_path, lastDirectoryName);
//             console.log(filePath);
//             if (fs.existsSync(profile_backup_path)) {
//                 console.log("exists", profile_backup_path);
//                 ProfileFile.findOne().then((mt4Data) => {
//                     if (!mt4Data) {
//                         console.log("File not found");
//                         return;
//                     }
//                     fs.writeFile(filePath, mt4Data.file, (err) => {
//                         if (err) {
//                             console.error("Error writing file:", err);
//                             return;
//                         }
//                         console.log("File downloaded successfully.");
//                     });
//                 });
//             }
//             // else {
//             //     console.log("Not exists", globalvar_backup_path);
//             //     fs.mkdir(globalvar_backup_path, function (err) {
//             //         if (err) {
//             //             console.log(err);
//             //         } else {
//             //             console.log(
//             //                 `New ${globalvar_backup_path} directory successfully created.`
//             //             );
//             //             GlobalvarFile.findOne().then((mt4Data) => {
//             //                 if (!mt4Data) {
//             //                     console.log("File not found");
//             //                     return;
//             //                 }
//             //                 fs.writeFile(filePath, mt4Data.file, (err) => {
//             //                     if (err) {
//             //                         console.error("Error writing file:", err);
//             //                         return;
//             //                     }
//             //                     console.log("File downloaded successfully.");
//             //                 });
//             //             });
//             //         }
//             //     });
//             // }
//             return res.redirect('back');

//         })
//         .catch((err) => {
//             console.log(err);
//         });
//     // MT4Model.findAll({})
//     //     .then((data) => {
//     //         data.forEach(async (data) => {
//     //             if (data.system_name === pchostname) {
//     //                 const profile_folder_path = data.profile_path;
//     //                 const profile_backup_path = data.profile_backup_path;
//     //                 const lastDirectoryName = path.basename(profile_folder_path + ".zip");
//     //                 const filePath = path.join(profile_backup_path, lastDirectoryName);

//     //                 if (fs.existsSync(profile_backup_path)) {
//     //                     console.log("exists", profile_backup_path);

//     //                     const mt4Data = await ProfileFile.findOne();
//     //                     if (!mt4Data) {
//     //                         console.log('File not found');
//     //                         return;
//     //                     }

//     //                     const fileToWritePath = path.join(profile_backup_path, "downloaded_file.zip");
//     //                     await fs.promises.writeFile(fileToWritePath, mt4Data.file);
//     //                     console.log('File downloaded successfully.');
//     //                 } else {
//     //                     console.log("Not exists", profile_backup_path);
//     //                     fs.mkdir(profile_backup_path, function (err) {
//     //                         if (err) {
//     //                             console.log(err);
//     //                         } else {
//     //                             console.log(
//     //                                 `New ${profile_backup_path} directory successfully created.`
//     //                             );
//     //                             ProfileFile.findOne().then((mt4Data) => {
//     //                                 if (!mt4Data) {
//     //                                     console.log("File not found");
//     //                                     return;
//     //                                 }
//     //                                 fs.writeFile(filePath, mt4Data.file, (err) => {
//     //                                     if (err) {
//     //                                         console.error("Error writing file:", err);
//     //                                         return;
//     //                                     }
//     //                                     console.log("File downloaded successfully.");
//     //                                 });
//     //                             });
//     //                         }
//     //                     });
//     //                 }

//     //                 // if (fs.existsSync(profile_folder_path)) {
//     //                 //     console.log("exists", profile_folder_path);
//     //                 //     if (fs.existsSync(profile_backup_path)) {
//     //                 //         fs.readdir(profile_backup_path, (err, files) => {
//     //                 //             if (err) {
//     //                 //                 console.error("Error:", err);
//     //                 //                 return;
//     //                 //             }
//     //                 //             if (files.length) {
//     //                 //                 const zip = new AdmZip(filePath);
//     //                 //                 zip.extractAllTo(profile_folder_path, true);
//     //                 //                 console.log("Files extracted from the zip folder.");
//     //                 //             }
//     //                 //         });
//     //                 //     }
//     //                 // } else {
//     //                 //     console.log("Not exists", profile_folder_path);
//     //                 //     fs.mkdir(profile_folder_path, function (err) {
//     //                 //         if (err) {
//     //                 //             console.log(err);
//     //                 //         } else {
//     //                 //             console.log(`New ${profile_folder_path} directory successfully created.`);
//     //                 //             if (fs.existsSync(profile_backup_path)) {
//     //                 //                 fs.readdir(profile_backup_path, (err, files) => {
//     //                 //                     if (err) {
//     //                 //                         console.error("Error:", err);
//     //                 //                         return;
//     //                 //                     }
//     //                 //                     if (files.length) {
//     //                 //                         const zip = new AdmZip(filePath);
//     //                 //                         zip.extractAllTo(profile_folder_path, true);
//     //                 //                         console.log("Files extracted from the zip folder.");
//     //                 //                     }
//     //                 //                 });
//     //                 //             }
//     //                 //         }
//     //                 //     });
//     //                 // }
//     //                 return res.redirect('back');
//     //             }
//     //         });
//     //     })
//     //     .catch((err) => {
//     //         console.log(err);
//     //     });
// }
const MT4GlobalvarBackUp = async (req, res) => {
    try {
        const system_name = req.query.system_name;
        const globalvar_file_path = req.query.globalvar_path;
        const globalvar_backup_path = req.query.globalvar_backup_path;
        const Finddata = await globalFileDownloadreq.findOne({ where: { system_name: system_name, globalvar_backup_path: globalvar_backup_path, globalvar_file_path: globalvar_file_path } });
        if (Finddata) {
            await globalFileDownloadreq.update({ status: 0 }, { where: { system_name: system_name, globalvar_backup_path: globalvar_backup_path, globalvar_file_path: globalvar_file_path } });
        } else {
            const newApp = await globalFileDownloadreq.create({ system_name: system_name, globalvar_backup_path: globalvar_backup_path, globalvar_file_path: globalvar_file_path });
            if (!newApp) {
                console.log(err);
            }
        }
        req.flash("success", "Your backup request has been sent successfully.");
        // Send email
        const emailSubject = `Manual Backup for gvariables File on Machine ${system_name}`;
        const emailText = `
                                                        Hello Team,<br>
                                                        <br>
                                                             A manual backup for the gvariables File was performed on ${updateAndLogCurrentDate()} on Machine ${system_name}. Details:<br>
                                                        <br>
                                                        - Backup Folder Path:: ${globalvar_backup_path} (Timestamp: ${updateAndLogCurrentDate()})<br>
                                                        <br>
                                                        Thank you!
                                                        `;
        const isEmailSent = await sendEmail(emailSubject, emailText);

        if (isEmailSent) {
            console.log("Email sent successfully.");
        } else {
            console.log("Email sending failed.");
        }
        return res.redirect('back');
    } catch (error) {
        console.log(error);
        return res.redirect('back');
    }
}

// const MT4GlobalvarBackUp = async (req, res) => {
//     const system_name = req.query.system_name;
//     const globalvar_file_path = req.query.globalvar_path.replace(/\\/g, "/");
//     await GlobalvarFile.findOne({ where: { system_name: system_name, globalvar_file_path: globalvar_file_path } })
//         .then((data) => {
//             const globalvar_path = data.globalvar_file_path;

//             const globalvar_backup_path = path.dirname(data.globalvar_backup_path).replace(/\\/g, "/");
//             const global_backup_directory = path.join(path.parse(data.globalvar_backup_path).dir, path.parse(data.globalvar_backup_path).name);
//             const globalvar_directory = path.join(path.parse(data.globalvar_file_path).dir);
//             console.log(globalvar_directory +"\n"+ "profile_backup_directoryprofile_backup_directoryprofile_backup_directory");
//             const lastDirectoryName = path.basename(global_backup_directory + ".zip");
//             const filePath = path.join(globalvar_backup_path, lastDirectoryName);
//             console.log(filePath);
//             if (fs.existsSync(globalvar_backup_path)) {
//                 console.log("exists", globalvar_backup_path);
//                 GlobalvarFile.findOne().then((mt4Data) => {
//                     if (!mt4Data) {
//                         console.log("File not found");
//                         return;
//                     }
//                     fs.writeFile(filePath, mt4Data.file, (err) => {
//                         if (err) {
//                             console.error("Error writing file:", err);
//                             return;
//                         }
//                         console.log("File downloaded successfully.");
//                     });
//                 });
//             } else {
//                 console.log("Not exists", globalvar_backup_path);
//                 fs.mkdir(globalvar_backup_path, function (err) {
//                     if (err) {
//                         console.log(err);
//                     } else {
//                         console.log(
//                             `New ${globalvar_backup_path} directory successfully created.`
//                         );
//                         GlobalvarFile.findOne().then((mt4Data) => {
//                             if (!mt4Data) {
//                                 console.log("File not found");
//                                 return;
//                             }
//                             fs.writeFile(filePath, mt4Data.file, (err) => {
//                                 if (err) {
//                                     console.error("Error writing file:", err);
//                                     return;
//                                 }
//                                 console.log("File downloaded successfully.");
//                             });
//                         });
//                     }
//                 });
//             }

//             if (fs.existsSync(globalvar_path)) {
//                 console.log("exists", globalvar_path);
//                 if (fs.existsSync(globalvar_backup_path)) {
//                     fs.readdir(globalvar_backup_path, (err, files) => {
//                         if (err) {
//                             console.error("Error:", err);
//                             return;
//                         }
//                         if (files.length) {
//                             const zip = new AdmZip(filePath);
//                             zip.extractAllTo(globalvar_directory, true);
//                             console.log("Files extracted from the zip folder.");
//                         }
//                     });
//                 }
//             } else {
//                 if (fs.existsSync(globalvar_backup_path)) {
//                     fs.readdir(globalvar_backup_path, (err, files) => {
//                         if (err) {
//                             console.error("Error:", err);
//                             return;
//                         }
//                         if (files.length) {
//                             const zip = new AdmZip(filePath);
//                             zip.extractAllTo(globalvar_directory, true);
//                             console.log("Files extracted from the zip folder.");
//                         }
//                     });
//                 }

//             }
//             return res.redirect('back');

//         })
//         .catch((err) => {
//             console.log(err);
//         });

// }

module.exports = { MT4ProfileBackUp, MT4GlobalvarBackUp, ProfileFolderdownload, GlobalVarFiledownload }
