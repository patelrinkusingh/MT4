const RegisterController = require("../controllers/RegisterController");
const AppController = require("../controllers/appController");
const UserRegister = require("../controllers/UserRegisterController");
const MT4Controller = require("../controllers/MT4Controller");
const MT4Filedownload = require("../controllers/MT4FileDownloadController");
const { sendEmail } = require("../config/mailtemplate");
// const { Profile ,UploadFile} = require("../controllers/BackupFilesController");
const os = require("os");
const router = require("express").Router();
const passport = require("passport");
const passport1 = require("../config/passport");
// Middleware to check if user is authenticated and admin
const inAdmin = (req, res, next) => {
    if (req.user) {
        const user = JSON.parse(JSON.stringify(req.user));
        const field = user.field;
        console.log(field);
        if (field === "Admin") {
            next();
        } else {
            res.redirect("AppPage");
        }
    }
};

//login
router.get("/", (req, res, next) => {
    if (req.isAuthenticated()) {
        return res.redirect("/AppPage");
    }
    return RegisterController.index(req, res, next);
});
router.post("/LoginData",
    async (req, res, next) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        req.session.logindata = req.body;
        if (!req.body.email) {
            req.flash("error", "Email is required");
            res.redirect("back");
        }
        if (!emailRegex.test(req.body.email)) {
            // email format is incorrect
            req.flash("error", "Please enter a valid email address");
            res.redirect("back");
        }
        if (!req.body.password) {
            req.flash("error", "Password is required");
            res.redirect("back");
        }
        next();
        // else {
        //     await passport.authenticate("local", {
        //         successRedirect: "/AppPage",
        //         failureRedirect: "/",
        //         failureFlash: true,
        //     })(req, res, next);
        // }
    }, RegisterController.LoginData);
router.get("/Logout", RegisterController.logout);

//app
// req.headers.authorization = `Bearer ${token}`;
router.get("/AppPage", passport.checkAuthentication, AppController.index);
router.post("/AppName", passport.checkAuthentication, AppController.appname);
router.get("/AddAppView/:page?", passport.checkAuthentication, AppController.addappview);
router.get("/AppEditPage/:eid", passport.checkAuthentication, AppController.appeditpage);
router.post("/AppEdit", passport.checkAuthentication, AppController.appedit);
router.get("/AppDelete/:did", passport.checkAuthentication, AppController.appdelete);
router.get("/AppRunList/:page?", passport.checkAuthentication, AppController.apprunlist);

//userregister
router.get("/RegisterPage", inAdmin, passport.checkAuthentication, UserRegister.index);
router.post("/Register", inAdmin, passport.checkAuthentication, UserRegister.UserLoginData);
router.get("/RegisterView/:page?", inAdmin, passport.checkAuthentication, UserRegister.registerview);
router.get("/RegisterEditPage/:eid", inAdmin, passport.checkAuthentication, UserRegister.registereditpage);
router.post("/RegisterEdit", inAdmin, passport.checkAuthentication, UserRegister.registeredit);
router.get("/RegisterDelete/:did", inAdmin, passport.checkAuthentication, UserRegister.registerdelete);

//mt4 database
router.get("/MT4Page", passport.checkAuthentication, MT4Controller.index);
router.post("/MT4PageData", passport.checkAuthentication, MT4Controller.MT4PageData);
router.get("/MT4ViewPage", passport.checkAuthentication, MT4Controller.MT4ViewPage);
router.get("/MT4EditPageView/:eid", passport.checkAuthentication, MT4Controller.MT4EditPageView);
router.post("/MT4EditPage", passport.checkAuthentication, MT4Controller.MT4EditPage);
router.get("/MT4Delete/:did", passport.checkAuthentication, MT4Controller.MT4Delete);
router.get("/MT4ProfileBackUpList/:page?", passport.checkAuthentication, MT4Controller.MT4ProfileBackUpList);
router.get("/MT4GlobalvarBackUpList/:page?", passport.checkAuthentication, MT4Controller.MT4GlobalvarBackUpList);
router.get("/MT4AppsLogList/:page?", passport.checkAuthentication, MT4Controller.MT4AppLogList);
router.get("/ErorrLogList/:page?", passport.checkAuthentication, MT4Controller.MT4ErorrLogList);
//mt4 restore backup
router.get("/MT4ProfileFolderRestoreList/:page?", passport.checkAuthentication, MT4Controller.MT4ProfileFolderRestoreList);
router.get("/MT4GlobalFileRestoreList/:page?", passport.checkAuthentication, MT4Controller.MT4GlobalFileRestoreList);
//mt4 files download
router.get("/ProfileFolderdownload", passport.checkAuthentication, MT4Filedownload.ProfileFolderdownload);
router.get("/GlobalVarFiledownload", passport.checkAuthentication, MT4Filedownload.GlobalVarFiledownload);
router.get("/MT4ProfileBackUp", MT4Filedownload.MT4ProfileBackUp);
router.get("/MT4GlobalvarBackUp", MT4Filedownload.MT4GlobalvarBackUp);
router.get('/BothBackUp', function (req, res) {
    axios.get("http://localhost:9999/MT4GlobalvarBackUp")
        .catch(function (error) {
            console.error("MT4GlobalvarBackUp error: " + error);
            return res.status(500).send("Error occurred while requesting MT4GlobalvarBackUp.");
        });

    axios.get("http://localhost:9999/MT4ProfileBackUp")
        .catch(function (error) {
            console.error("MT4ProfileBackUp error: " + error);
            return res.status(500).send("Error occurred while requesting MT4ProfileBackUp.");
        });
    return res.redirect('back');
});
module.exports = router;

const cron = require("node-cron");
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const { spawn } = require("child_process");
const fs = require('fs');
const AdmZip = require('adm-zip');
const fsExtra = require('fs-extra');
const axios = require("axios");
const archiver = require("archiver");
const path = require('path');
const chokidar = require('chokidar');
var ip = require('ip');
const myip = ip.address();
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
const pchostname = os.hostname();
//cron job
const db = require("../models");
const { log, profile } = require("console");
const appregisters = db.appregisters;
const apprunmodel = db.apprunmodel;
const MT4Model = db.MT4Model;
const ProfileFile = db.ProfileFile;
const GlobalvarFile = db.GlobalvarFile;
const MT4ErrorLogLists = db.MT4ErrorLogList;
const profileFolderDownloadReq = db.ProfileFolderDownloadReq;
const globalFileDownloadreq = db.GlobalFileDownloadreq;
const ProfileFolderRestore = db.ProfileFolderRestore;
const GlobalFileRestore = db.GlobalFileRestore;
const getLastModificationDate = (path) => {
    if (fs.existsSync(path)) {
        const stats = fs.statSync(path);
        const mtime = stats.mtime;
        const options = {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "numeric",
            second: "numeric",
            hour12: true,
        };
        const formattedDate = mtime.toLocaleString('en-IN', options); // Change the locale and options here
        return formattedDate;
    }
};
cron.schedule("* * * * * *", () => {
    const rootDirectories = ["C:\\Program Files (x86)", "C:\\Program Files"];
    const directoriesToCheck = rootDirectories.flatMap((rootDirectory) =>
        fs
            .readdirSync(rootDirectory)
            .map((item) => path.join(rootDirectory, item))
            .filter((path) => fs.statSync(path).isDirectory())
    );
    (async () => {
        try {
            const { stdout } = await exec("wmic process get Caption, ExecutablePath"); // Get list of running processes with name and path
            const processArray = stdout
                .trim()
                .split("\r\r\n")
                .slice(1)
                .map((line) => {
                    const [name, path] = line.trim().split(/\s{2,}/);
                    return { name, path: path ? path.replace(/\\/g, "/") : null };
                });
            // Loop through the apps in the database and check if they are running with the correct path
            const apps = await appregisters.findAll({});
            console.log(apps);
            await Promise.all(
                apps.map(async (app) => {
                    const { name, path: apppath } = app;
                    if (apppath && apppath.endsWith(".exe")) {
                        // Check if the app is already running
                        const matchingProcesses = processArray.filter((process) => {
                            return process.path === apppath || process.name === name;
                        });
                        if (matchingProcesses.length > 0) {
                            return;
                        } else {
                            // If the app is not already running with the correct path, record its start time and start the process
                            // await apprunmodel.create({
                            //     App_Name: name,
                            //     App_Path: path,
                            //     App_Start_Time: currentDate,
                            // });
                            if (apppath) {
                                console.log("hi");
                                await exec(`start "" "${apppath}"`);
                                console.log(`${name} started on ${updateAndLogCurrentDate()}.`);
                            } else {
                                console.error(`apppath is undefined for ${name}`);
                            }
                        }
                    }
                })
            );
        } catch (err) {
            console.error(err);
        }
    })();
});
//err log 
const createOrUpdateErrorLog = async (system_name, errorMessage) => {
    try {
        console.log(updateAndLogCurrentDate() + "-**********************************--------------");
        const existingLog = await MT4ErrorLogLists.findOne({ where: { system_name: system_name } });
        // if (existingLog) {
        //     // Update existing log timestamp
        //     await MT4ErrorLogLists.update(
        //         { time: updateAndLogCurrentDate(), error: errorMessage },
        //         { where: { system_name: system_name } }
        //     );
        //     console.log("Error log updated successfully11: " + errorMessage, updateAndLogCurrentDate());
        // } else {
        // Insert new log
        await MT4ErrorLogLists.create({
            system_name: system_name,
            error: errorMessage,
            time: updateAndLogCurrentDate(),
        });
        // console.log("Error log inserted successfully22: " + errorMessage, updateAndLogCurrentDate());
        // }
    } catch (error) {
        console.error("Error while creating/updating error log:", error);
    }
}
const errorMessagegetdata = async () => {
    try {
        const MT4ErrorLogList = await MT4ErrorLogLists.findAll({});
        // console.log("MT4ErrorLogList:", MT4ErrorLogList);
        const currentTime = new Date();
        const sixtyAgo = new Date(currentTime.getTime() - 20 * 60 * 1000); // 20 minutes 

        for (const log of MT4ErrorLogList) {
            const createdAt = new Date(log.dataValues.createdAt);
            if (createdAt < sixtyAgo) {
                await MT4ErrorLogLists.destroy({ where: { id: log.dataValues.id } });
                // console.log("Deleted record:", log.dataValues);
            }
        }
    } catch (error) {
        console.error("Error while fetching/error logs:", error);
    }
}
//Profile change data
let isChangeDetected = false;

const ProfileModeCheck = async () => {
    try {
        const dataEntries = await MT4Model.findAll({ where: { system_name: pchostname } });

        for (const data of dataEntries) {
            const { profile_path, profile_backup_path, globalvar_path, globalvar_backup_path } = data;
            const profile_folder_path = profile_path;
            const folderExists1 = await fs.existsSync(profile_folder_path);
            const globalvarBackupParentDir = path.dirname(globalvar_backup_path);

            const fileWatcher = fs.watch(profile_folder_path, { persistent: true }, async (event, filename) => {
                const fullPath = await path.join(profile_folder_path, filename);
                const relativePath = await path.relative(fullPath, globalvar_backup_path);
                const relativePath1 = await path.relative(fullPath, globalvar_path);
                const filecheckup = !relativePath.startsWith('..') || !relativePath1.startsWith('..');
                if (filecheckup == true) {
                    console.log(relativePath + "            " + "Change detected in a subdirectory, ignoring.");
                    console.log(fullPath + "            " + "filename.");
                    return;
                }
                if (!isChangeDetected && !filecheckup) {

                    let message = '';
                    switch (event) {
                        case 'add':
                            message = `File ${filename} was added to folder ${profile_folder_path}.`;
                            fileWatcher.close();
                            break;
                        case 'change':
                            message = `File ${filename} in folder ${profile_folder_path} was modified.`;
                            fileWatcher.close();
                            break;
                        case 'unlink':
                            returnmessage = `File ${filename} was deleted from folder ${profile_folder_path}.`;
                            fileWatcher.close();
                            break;
                        default:
                            message = `Event ${event} occurred for file ${filename}.`;
                            fileWatcher.close();
                            break;
                    }

                    if (message) {
                        console.log(message);
                        isChangeDetected = true;
                        schedule.stop();
                        fileWatcher.close();
                        await ProfileBackUprecover(profile_folder_path, profile_backup_path, fileWatcher);
                        return;
                    }
                }
                schedule.start();
            });
            if (!folderExists1) {
                console.log("me chala");
                fileWatcher.close();
                await ProfileBackUprecover(profile_folder_path, profile_backup_path, fileWatcher);
                return;
            }
            schedule.start();
        }
    } catch (error) {
        console.error("Error during ProfileModeCheck:", error);
    }
};
const ProfileBackUprecover = async (profile_folder_path, profile_backup_path, fileWatcher) => {
    try {
        console.log(profile_folder_path + " " + profile_backup_path);
        if (fs.existsSync(profile_folder_path)) {
            isChangeDetected = true;
            fileWatcher.close();
            await fs.rmdirSync(profile_folder_path, { recursive: true });
            console.log(`Deleted existing ${profile_folder_path} directory.`);
        }
        const zipfolder_path = profile_folder_path + ".zip";
        if (fs.existsSync(profile_folder_path)) {
            console.log("exists", profile_folder_path);
            fs.readdir(profile_folder_path, (err, files) => {
                if (err) {
                    console.error("Error:", err);
                    return;
                }
                if (files.length) {
                    console.log("Folder empty");
                    if (fs.existsSync(profile_backup_path)) {
                        console.log("exists", profile_backup_path);
                        fs.readdir(profile_backup_path, async (err, files) => {
                            if (err) {
                                console.error("Error:", err);
                                return;
                            }
                            if (files.length) {
                                const zip = new AdmZip(
                                    require('path').join(
                                        profile_backup_path,
                                        path.basename(zipfolder_path)
                                    )
                                );
                                isChangeDetected = true;
                                fileWatcher.close();
                                zip.extractAllTo(profile_folder_path, true);
                                await ProfileFolderRestore.create({
                                    system_name: pchostname,
                                    profile_path: profile_folder_path,
                                    time: updateAndLogCurrentDate(),
                                });
                                const emailSubject = ` profiles folder is restored in system }`;
                                const name = ["profile_path"];
                                const paths = [profile_folder_path];
                                const emailText = { name: name, paths: paths };
                                const isEmailSent = await sendEmail(emailSubject, emailText);
                                if (isEmailSent) {
                                    console.log("Email sent successfully.");
                                } else {
                                    console.log("Email sending failed.");
                                }
                                console.log("Files extracted from the zip folder.");
                                ProfileModeCheck();
                            }
                        });
                    }
                }
            });
        } else {
            console.log("not exists", profile_folder_path);
            fs.mkdir(profile_folder_path, function (err) {
                if (err) {
                    console.log(err);
                } else {
                    console.log(
                        `New ${profile_folder_path} directory successfully created.`
                    );
                    if (fs.existsSync(profile_backup_path)) {
                        console.log("exists", profile_backup_path);
                        fs.readdir(profile_backup_path, async (err, files) => {
                            if (err) {
                                console.error("Error:", err);
                                return;
                            }
                            if (files.length) {
                                const zip = new AdmZip(
                                    require('path').join(
                                        profile_backup_path,
                                        path.basename(zipfolder_path)
                                    )
                                );
                                isChangeDetected = true;
                                fileWatcher.close();
                                zip.extractAllTo(profile_folder_path, true);

                                await ProfileFolderRestore.create({
                                    system_name: pchostname,
                                    profile_path: profile_folder_path,
                                    time: updateAndLogCurrentDate(),
                                });
                                const emailSubject = ` profiles folder is restored in system }`;
                                const name = ["profile_path"];
                                const paths = [profile_folder_path];
                                const emailText = { name: name, paths: paths };
                                const isEmailSent = await sendEmail(emailSubject, emailText);
                                if (isEmailSent) {
                                    console.log("Email sent successfully.");
                                } else {
                                    console.log("Email sending failed.");
                                }
                                console.log("Files extracted from the zip folder.");
                                ProfileModeCheck();
                            }
                        });
                    }
                }
            });
        }
        isChangeDetected = false;
        fileWatcher.start();
        await ProfileModeCheck();
    } catch (error) {
        console.error("Error in ProfileBackUprecover:", error);
    }
};
const UploadFile = async (destinationPath, profile_folder_path, system_name) => {
    try {
        // const zipFileBuffer = await fs.readFileSync(zipfolder_path);
        const zipFileBuffer = await fs.promises.readFile(destinationPath);
        const data = await ProfileFile.findAll();
        if (data) {
            let ipFound = false;
            for (const profile of data) {
                if (profile.profile_backup_path === destinationPath) {
                    ipFound = true;
                    console.log("data");
                    await ProfileFile.update(
                        {
                            file: zipFileBuffer,
                            system_name: system_name,
                            time: updateAndLogCurrentDate(),
                            profile_folder_path: profile_folder_path,
                            profile_backup_path: destinationPath,
                        },
                        { where: { id: profile.id } }
                    );
                    console.log("Record successfully updated");
                }
            }
            if (!ipFound) {
                console.log("IP not found");
                await ProfileFile.create({
                    file: zipFileBuffer,
                    system_name: system_name,
                    time: updateAndLogCurrentDate(),
                    profile_folder_path: profile_folder_path,
                    profile_backup_path: destinationPath,
                });
                console.log("Record successfully inserted");
            }
        }
    } catch (err) {
        console.log(err);
        // Handle errors
    }
};
const Profile = async (req, res) => {
    // const dataEntries = await MT4Model.findOne({ where: { status: 0 } });
    // if (dataEntries) {
    //     await createOrUpdateErrorLog(dataEntries.system_name, `system_name does not exist at ${dataEntries.system_name}`, updateAndLogCurrentDate());
    //     return;
    // }
    MT4Model.findAll({})
        .then((data) => {
            data.forEach(async (data) => {
                if (data.system_name === pchostname) {
                    const updatedRows = await MT4Model.update({ status: 1 },
                        {
                            where: {
                                system_name: data.system_name,
                                profile_path: data.profile_path,
                                profile_backup_path: data.profile_backup_path,
                                globalvar_path: data.globalvar_path,
                                globalvar_backup_path: data.globalvar_backup_path,
                                status: 0
                            }
                        }
                    );

                    if (updatedRows[0] !== 0) {
                        console.log(`${updatedRows[0]} row(s) updated successfully.`);
                    }

                    console.log("ip found 123 123 13");
                    const system_name = data.system_name;
                    const profile_folder_path = data.profile_path;
                    const profile_backup_path = data.profile_backup_path;
                    const zipfolder_path = profile_folder_path + ".zip";
                    const folderExists = await fs.existsSync(profile_folder_path);
                    const folderExists1 = await fs.existsSync(profile_backup_path);
                    console.log("Current Date and Time:", updateAndLogCurrentDate());
                    if (!folderExists && !folderExists1) {
                        console.log('Profile folder does not exist.');
                        await createOrUpdateErrorLog(system_name, `Profile folder does not exist at ${profile_folder_path}`);
                        return;
                    }
                    //profile_folder_path code
                    // if (fs.existsSync(profile_folder_path)) {
                    //     console.log("exists", profile_folder_path);
                    //     fs.readdir(profile_folder_path, (err, files) => {
                    //         if (err) {
                    //             console.error("Error:", err);
                    //             return;
                    //         }
                    //         if (files.length) {
                    //             console.log("Folder not empty");
                    //         } else {
                    //             console.log("Folder empty");
                    //             if (fs.existsSync(profile_backup_path)) {
                    //                 console.log("exists", profile_backup_path);
                    //                 fs.readdir(profile_backup_path, async (err, files) => {
                    //                     if (err) {
                    //                         console.error("Error:", err);
                    //                         return;
                    //                     }
                    //                     if (files.length) {
                    //                         const zip = new AdmZip(
                    //                             path.join(
                    //                                 profile_backup_path,
                    //                                 path.basename(zipfolder_path)
                    //                             )
                    //                         );
                    //                         zip.extractAllTo(profile_folder_path, true);
                    //                         console.log("Files extracted from the zip folder.");
                    //                         const emailSubject = `The ${system_name} name system automatically creates backups of the profile folder.`;
                    //                         const name = ["profile_backup_path", "zipfolder_path"];
                    //                         const path = [profile_backup_path, zipfolder_path];
                    //                         const emailText = { name: name, path: path };
                    //                         const isEmailSent = await sendEmail(emailSubject, emailText);
                    //                         if (isEmailSent) {
                    //                             console.log("Email sent successfully.");
                    //                         } else {
                    //                             console.log("Email sending failed.");
                    //                         }
                    //                     } else {
                    //                         console.log("Folder empty");
                    //                         axios
                    //                             .get("http://localhost:9999/MT4ProfileBackUp")
                    //                             .catch(function (error) {
                    //                                 console.error("response.data err" + error);
                    //                             });
                    //                     }
                    //                 });
                    //             } else {
                    //                 console.log("not exists", profile_backup_path);
                    //                 fs.mkdir(profile_backup_path, function (err) {
                    //                     if (err) {
                    //                         console.log(err);
                    //                     } else {
                    //                         console.log(
                    //                             `New ${profile_backup_path} directory successfully created.`
                    //                         );
                    //                         axios
                    //                             .get("http://localhost:9999/MT4ProfileBackUp")
                    //                             .catch(function (error) {
                    //                                 console.error("response.data err" + error);
                    //                             });
                    //                     }
                    //                 });
                    //             }
                    //         }
                    //     });
                    // } else {
                    //     console.log("not exists", profile_folder_path);
                    //     fs.mkdir(profile_folder_path, function (err) {
                    //         if (err) {
                    //             console.log(err);
                    //         } else {
                    //             console.log(
                    //                 `New ${profile_folder_path} directory successfully created.`
                    //             );
                    //             if (fs.existsSync(profile_backup_path)) {
                    //                 console.log("exists", profile_backup_path);
                    //                 fs.readdir(profile_backup_path, async (err, files) => {
                    //                     if (err) {
                    //                         console.error("Error:", err);
                    //                         return;
                    //                     }
                    //                     if (files.length) {
                    //                         const zip = new AdmZip(
                    //                             path.join(
                    //                                 profile_backup_path,
                    //                                 path.basename(zipfolder_path)
                    //                             )
                    //                         );
                    //                         zip.extractAllTo(profile_folder_path, true);
                    //                         const emailSubject = `The ${system_name} name system automatically creates backups of the profile folder.`;
                    //                         const name = ["profile_backup_path", "zipfolder_path"];
                    //                         const path = [profile_backup_path, zipfolder_path];
                    //                         const emailText = { name: name, path: path };
                    //                         const isEmailSent = await sendEmail(emailSubject, emailText);
                    //                         if (isEmailSent) {
                    //                             console.log("Email sent successfully.");
                    //                         } else {
                    //                             console.log("Email sending failed.");
                    //                         }
                    //                         console.log("Files extracted from the zip folder.");
                    //                     } else {
                    //                         console.log("Folder empty");
                    //                         axios
                    //                             .get("http://localhost:9999/MT4ProfileBackUp")
                    //                             .catch(function (error) {
                    //                                 console.error("response.data err" + error);
                    //                             });
                    //                     }
                    //                 });
                    //             } else {
                    //                 console.log("not exists", profile_backup_path);
                    //                 fs.mkdir(profile_backup_path, function (err) {
                    //                     if (err) {
                    //                         console.log(err);
                    //                     } else {
                    //                         console.log(
                    //                             `New ${profile_backup_path} directory successfully created.`
                    //                         );
                    //                         axios
                    //                             .get("http://localhost:9999/MT4ProfileBackUp")
                    //                             .catch(function (error) {
                    //                                 console.error("response.data err" + error);
                    //                             });
                    //                     }
                    //                 });
                    //             }
                    //         }
                    //     });
                    // }

                    // profile_backup_path code
                    if (fs.existsSync(profile_backup_path)) {
                        console.log("exists", profile_backup_path);
                        if (fs.existsSync(profile_folder_path)) {
                            console.log("exists", profile_folder_path);
                            fs.readdir(profile_folder_path, (err, files) => {
                                if (err) {
                                    console.error("Error:", err);
                                    return;
                                }
                                if (files.length) {
                                    console.log("Folder not empty - backup code");
                                    const output = fs.createWriteStream(zipfolder_path);
                                    const archive = archiver("zip", {
                                        zlib: { level: 9 },
                                    });
                                    archive.on("error", function (err) {
                                        console.error("Error while compressing the folder:", err);
                                    });
                                    archive.pipe(output);
                                    archive.directory(profile_folder_path, false);
                                    archive.finalize();
                                    output.on("close", async function () {
                                        console.log("Folder compressed successfully.");
                                        const destinationPath = path.join(
                                            profile_backup_path,
                                            path.basename(zipfolder_path)
                                        );
                                        fs.rename(zipfolder_path, destinationPath, async (err) => {
                                            if (err) {
                                                console.log(
                                                    "Error while moving the zip folder:",
                                                    err
                                                );
                                            } else {
                                                console.log(
                                                    `Zip folder successfully moved to ${profile_backup_path}.`
                                                );
                                                const emailSubject = `Taking a manual backup of the profiles folder in system ${system_name}`;
                                                const name = ["profile_path", "profile_backup_path"];
                                                const paths = [profile_folder_path, profile_backup_path];
                                                const emailText = { name: name, paths: paths };
                                                const isEmailSent = await sendEmail(emailSubject, emailText);
                                                if (isEmailSent) {
                                                    console.log("Email sent successfully.");
                                                } else {
                                                    console.log("Email sending failed.");
                                                }
                                                await UploadFile(destinationPath, profile_folder_path, system_name);
                                            }
                                        });
                                    });
                                } else {
                                    console.log("Folder empty -backup code");
                                    axios
                                        .get("http://localhost:9999/MT4ProfileBackUp")
                                        .catch(function (error) {
                                            console.error("response.data err" + error);
                                        });
                                }
                            });
                        } else {
                            console.log("not exists", profile_folder_path);
                            fs.mkdir(profile_folder_path, function (err) {
                                if (err) {
                                    console.log(err);
                                } else {
                                    console.log(
                                        `New ${profile_folder_path} directory successfully created.`
                                    );
                                    axios
                                        .get("http://localhost:9999/MT4ProfileBackUp")
                                        .catch(function (error) {
                                            console.error("response.data err" + error);
                                        });
                                }
                            });
                        }
                    } else {
                        console.log("not exists", profile_backup_path);
                        fs.mkdir(profile_backup_path, function (err) {
                            if (err) {
                                console.log(err);
                            } else {
                                console.log(
                                    `New ${profile_backup_path} directory successfully created.`
                                );
                                if (fs.existsSync(profile_folder_path)) {
                                    console.log("exists", profile_folder_path);
                                    fs.readdir(profile_folder_path, (err, files) => {
                                        if (err) {
                                            console.error("Error:", err);
                                            return;
                                        }
                                        if (files.length) {
                                            console.log("Folder not empty - backup code");
                                            const output = fs.createWriteStream(zipfolder_path);
                                            const archive = archiver("zip", {
                                                zlib: { level: 9 },
                                            });
                                            archive.on("error", function (err) {
                                                console.error(
                                                    "Error while compressing the folder:",
                                                    err
                                                );
                                            });
                                            archive.pipe(output);
                                            archive.directory(profile_folder_path, false);
                                            archive.finalize();
                                            output.on("close", async function () {
                                                console.log("Folder compressed successfully.");
                                                const destinationPath = path.join(
                                                    profile_backup_path,
                                                    path.basename(zipfolder_path)
                                                );
                                                fs.rename(zipfolder_path, destinationPath, async (err) => {
                                                    if (err) {
                                                        console.error(
                                                            "Error while moving the zip folder:",
                                                            err
                                                        );
                                                    } else {
                                                        console.log(
                                                            `Zip folder successfully moved to ${profile_backup_path}.`
                                                        );
                                                        const emailSubject = `Taking a manual backup of the profiles folder in system ${system_name}`;
                                                        const name = ["profile_path", "profile_backup_path"];
                                                        const paths = [profile_folder_path, profile_backup_path];
                                                        const emailText = { name: name, paths: paths };
                                                        const isEmailSent = await sendEmail(emailSubject, emailText);
                                                        if (isEmailSent) {
                                                            console.log("Email sent successfully.");
                                                        } else {
                                                            console.log("Email sending failed.");
                                                        }
                                                        await UploadFile(destinationPath, profile_folder_path, system_name);
                                                    }
                                                });
                                            });
                                        } else {
                                            console.log("Folder empty -backup code");
                                            axios
                                                .get("http://localhost:9999/MT4ProfileBackUp")
                                                .catch(function (error) {
                                                    console.error("response.data err" + error);
                                                });
                                        }
                                    });
                                } else {
                                    console.log("not exists", profile_folder_path);
                                    fs.mkdir(profile_folder_path, function (err) {
                                        if (err) {
                                            console.log(err);
                                        } else {
                                            console.log(
                                                `New ${profile_folder_path} directory successfully created.`
                                            );
                                            axios
                                                .get("http://localhost:9999/MT4ProfileBackUp")
                                                .catch(function (error) {
                                                    console.error("response.data err" + error);
                                                });
                                        }
                                    });
                                }
                            }
                        });
                    }
                }
            });
        })
        .catch((err) => {
            console.log(err);
        });
};

//global Var File
function getLastModificationDate1(path) {
    const stats = fs.statSync(path);
    return stats.mtime;
}
const GlobalVarUploadFile = async (destinationPath, globalvar_path, system_name) => {
    try {
        const zipFileBuffer = fs.readFileSync(destinationPath);
        const data = await GlobalvarFile.findAll();
        if (data) {
            let ipFound = false;
            for (const globalvar of data) {
                if (globalvar.globalvar_backup_path === destinationPath) {
                    ipFound = true;
                    console.log("globalvar");
                    await GlobalvarFile.update(
                        {
                            file: zipFileBuffer,
                            system_name: system_name,
                            time: updateAndLogCurrentDate(),
                            globalvar_file_path: globalvar_path,
                            globalvar_backup_path: destinationPath
                        },
                        { where: { id: globalvar.id } }
                    );
                    console.log("Record successfully updated");
                }
            }
            if (!ipFound) {
                console.log("IP not found");
                await GlobalvarFile.create({
                    file: zipFileBuffer,
                    system_name: system_name,
                    time: updateAndLogCurrentDate(),
                    globalvar_file_path: globalvar_path,
                    globalvar_backup_path: destinationPath
                });
                console.log("Record successfully inserted");
            }
        }
    } catch (err) {
        console.log(err);
        // Handle errors
    }
};
const GlobalVar = async (req, res) => {
    // const dataEntries = await MT4Model.findOne({ where: { status: 0 } });
    // if (dataEntries) {
    //     await createOrUpdateErrorLog(dataEntries.system_name, `system_name does not exist at ${dataEntries.system_name}`, updateAndLogCurrentDate());
    //     return;
    // }
    MT4Model.findAll({})
        .then(async (data) => {
            data.forEach(async (data) => {
                if (data.system_name === pchostname) {
                    ipFound1 = true;
                    const system_name = data.system_name;
                    const globalvar_path = data.globalvar_path;
                    const globalvar_backup_path = data.globalvar_backup_path;
                    const zipFileName = 'gvariables.zip';
                    const zipFilePath = path.join(globalvar_backup_path, zipFileName);
                    const filepath = path.join(globalvar_backup_path, path.basename(globalvar_path));
                    const modifidtime1 = getLastModificationDate(globalvar_path);
                    const modifidtime2 = getLastModificationDate(zipFilePath);
                    const date1 = new Date(Date.parse(modifidtime1));
                    const date2 = new Date(Date.parse(modifidtime2));
                    const folderExists11 = await util.promisify(fs.exists)(data.profile_folder_path);
                    const folderExists111 = await util.promisify(fs.exists)(data.profile_backup_path);
                    // if (!folderExists11 && !folderExists111) {
                    //     console.log('Profile folder does not exist.');
                    //     await createOrUpdateErrorLog(system_name, `Profile folder does not exist at ${data.profile_folder_path}`);
                    //     return;
                    // }
                    const zipfolder_path1 = "gvariables.zip";
                    const folderExists = await util.promisify(fs.exists)(globalvar_path);
                    const folderExists1 = await util.promisify(fs.exists)(globalvar_backup_path);
                    const profileBackupPathExists = fs.existsSync(data.profile_folder_path);

                    if (!folderExists && !folderExists1) {
                        console.log('Global var folder does not exist.');
                        await createOrUpdateErrorLog(system_name, `Global var does not exist at ${globalvar_path}`, updateAndLogCurrentDate());
                        return;
                    }
                    const parentDirectory = path.dirname(globalvar_path);
                    //globalvar_backup_path code
                    if (date1 > date2 || date2 == "Invalid Date") {

                        if (fs.existsSync(globalvar_path)) {
                            // console.log("File exists:", globalvar_path);

                            // if (!fs.existsSync(globalvar_backup_path)) {
                            //     console.log("Backup directory not exists, creating:", globalvar_backup_path);
                            //     fs.mkdirSync(globalvar_backup_path, { recursive: true });
                            // }
                            // const zip = new AdmZip();
                            // zip.addLocalFile(globalvar_path);
                            // zip.writeZip(zipFilePath);

                            // console.log(`File ${globalvar_path} is zipped and moved to ${zipFilePath}`);
                            if (fs.existsSync(globalvar_backup_path)) {
                                console.log("Backup directory exists:", globalvar_backup_path);
                                fs.readdir(globalvar_backup_path, (err, files) => {
                                    if (err) {
                                        console.error("Error:", err);
                                        return;
                                    }
                                    if (files.length) {
                                        const zip = new AdmZip(
                                            path.join(
                                                globalvar_backup_path,
                                                path.basename(zipFilePath)
                                            )
                                        );
                                        zip.extractAllTo(globalvar_backup_path, true);
                                        console.log("Files extracted from the zip folder.");
                                        const extractedFiles = fs.readdirSync(globalvar_backup_path);
                                        extractedFiles.forEach(async (file) => {
                                            const sourceFile = path.join(globalvar_backup_path, file);
                                            // Check if the file is not the zip file before moving
                                            if (file !== path.basename(zipFilePath)) {
                                                const destinationFile = path.join(parentDirectory, file);
                                                fs.renameSync(sourceFile, destinationFile);
                                                GlobalFileRestore.create({
                                                    system_name: system_name,
                                                    globalvar_path: globalvar_path,
                                                    time: updateAndLogCurrentDate(),
                                                });

                                                const emailSubject = `The ${system_name} name system automatically restore backups of the gvariables file.`;
                                                const name = ["globalvar_backup_path", "zipFilePath"];
                                                const paths = [globalvar_backup_path, zipFilePath];
                                                const emailText = { name: name, paths: paths };
                                                const isEmailSent = await sendEmail(emailSubject, emailText);
                                                if (isEmailSent) {
                                                    console.log("Email sent successfully.");
                                                } else {
                                                    console.log("Email sending failed.");
                                                }
                                            }
                                        });
                                    } else {
                                        console.log("Folder empty");
                                        axios
                                            .get("http://localhost:9999/MT4GlobalvarBackUp")
                                            .catch(function (error) {
                                                console.error("response.data err" + error);
                                            });
                                    }
                                });
                            }
                        } else {
                            console.log("File does not exist:", globalvar_path);
                            const parentDirectory = path.dirname(globalvar_path);
                            console.log("Parent directory of globalvar_path:", parentDirectory);
                            if (fs.existsSync(globalvar_backup_path)) {
                                console.log("Backup directory exists:", globalvar_backup_path);
                                fs.readdir(globalvar_backup_path, (err, files) => {
                                    if (err) {
                                        console.error("Error:", err);
                                        return;
                                    }
                                    if (files.length) {
                                        const zip = new AdmZip(
                                            path.join(
                                                globalvar_backup_path,
                                                path.basename(zipFilePath)
                                            )
                                        );
                                        zip.extractAllTo(globalvar_backup_path, true);
                                        console.log("Files extracted from the zip folder.");
                                        const extractedFiles = fs.readdirSync(globalvar_backup_path);
                                        extractedFiles.forEach(async (file) => {
                                            const sourceFile = path.join(globalvar_backup_path, file);
                                            // Check if the file is not the zip file before moving
                                            if (file !== path.basename(zipFilePath)) {
                                                const destinationFile = path.join(parentDirectory, file);
                                                fs.renameSync(sourceFile, destinationFile);
                                                GlobalFileRestore.create({
                                                    system_name: system_name,
                                                    globalvar_path: globalvar_path,
                                                    time: updateAndLogCurrentDate(),
                                                });
                                                const emailSubject = `The ${system_name} name system automatically restore backups of the gvariables file.`;
                                                const name = ["globalvar_backup_path", "zipFilePath"];
                                                const paths = [globalvar_backup_path, zipFilePath];
                                                const emailText = { name: name, paths: paths };
                                                const isEmailSent = await sendEmail(emailSubject, emailText);
                                                if (isEmailSent) {
                                                    console.log("Email sent successfully.");
                                                } else {
                                                    console.log("Email sending failed.");
                                                }
                                            }
                                        });
                                    } else {
                                        console.log("Folder empty");
                                        axios
                                            .get("http://localhost:9999/MT4GlobalvarBackUp")
                                            .catch(function (error) {
                                                console.error("response.data err" + error);
                                            });
                                    }
                                });
                            } else {
                                console.log("Backup directory does not exist:", globalvar_backup_path);
                                fs.mkdir(globalvar_backup_path, { recursive: true }, function (err) {
                                    if (err) {
                                        console.log(err);
                                    } else {
                                        console.log(`New ${globalvar_backup_path} directory successfully created.`);
                                        axios
                                            .get("http://localhost:9999/MT4GlobalvarBackUp")
                                            .catch(function (error) {
                                                console.error("response.data err" + error);
                                            });
                                    }
                                });
                            }
                        }
                    }
                    // //globalvar_path code
                    // if (fs.existsSync(globalvar_path)) {
                    //     console.log("File exists:", globalvar_path);

                    //     // if (!fs.existsSync(globalvar_backup_path)) {
                    //     //     console.log("Backup directory not exists, creating:", globalvar_backup_path);
                    //     //     fs.mkdirSync(globalvar_backup_path, { recursive: true });
                    //     // }
                    //     // const zip = new AdmZip();
                    //     // zip.addLocalFile(globalvar_path);
                    //     // zip.writeZip(zipFilePath);

                    //     // console.log(`File ${globalvar_path} is zipped and moved to ${zipFilePath}`);
                    // } else {
                    //     console.log("File does not exist:", globalvar_path);
                    //     const parentDirectory = path.dirname(globalvar_path);
                    //     console.log("Parent directory of globalvar_path:", parentDirectory);
                    //     if (fs.existsSync(globalvar_backup_path)) {
                    //         console.log("Backup directory exists:", globalvar_backup_path);
                    //         fs.readdir(globalvar_backup_path, (err, files) => {
                    //             if (err) {
                    //                 console.error("Error:", err);
                    //                 return;
                    //             }
                    //             if (files.length) {
                    //                 const zip = new AdmZip(
                    //                     path.join(
                    //                         globalvar_backup_path,
                    //                         path.basename(zipFilePath)
                    //                     )
                    //                 );
                    //                 zip.extractAllTo(globalvar_backup_path, true);
                    //                 console.log("Files extracted from the zip folder.");
                    //                 const extractedFiles = fs.readdirSync(globalvar_backup_path);
                    //                 extractedFiles.forEach((file) => {
                    //                     const sourceFile = path.join(globalvar_backup_path, file);
                    //                     // Check if the file is not the zip file before moving
                    //                     if (file !== path.basename(zipFilePath)) {
                    //                         const destinationFile = path.join(parentDirectory, file);
                    //                         fs.renameSync(sourceFile, destinationFile);
                    //                     }
                    //                 });
                    //             } else {
                    //                 console.log("Folder empty");
                    //                 axios
                    //                     .get("http://localhost:9999/MT4GlobalvarBackUp")
                    //                     .catch(function (error) {
                    //                         console.error("response.data err" + error);
                    //                     });
                    //             }
                    //         });
                    //     } else {
                    //         console.log("Backup directory does not exist:", globalvar_backup_path);
                    //         fs.mkdir(globalvar_backup_path, { recursive: true }, function (err) {
                    //             if (err) {
                    //                 console.log(err);
                    //             } else {
                    //                 console.log(`New ${globalvar_backup_path} directory successfully created.`);
                    //                 axios
                    //                     .get("http://localhost:9999/MT4GlobalvarBackUp")
                    //                     .catch(function (error) {
                    //                         console.error("response.data err" + error);
                    //                     });
                    //             }
                    //         });
                    //     }
                    // }

                    if (fs.existsSync(globalvar_backup_path)) {
                        // if (fs.existsSync(globalvar_path)) {
                        //     console.log("exists hello", globalvar_path);
                        //     console.log("har har mahadev");
                        //     const output = fs.createWriteStream(zipFilePath);
                        //     const archive = archiver("zip", {
                        //         zlib: { level: 9 },
                        //     });
                        //     archive.on("error", function (err) {
                        //         console.error("Error while compressing the folder:", err);
                        //     });
                        //     archive.pipe(output);
                        //     archive.file(globalvar_path, { name: path.basename(globalvar_path) });
                        //     archive.finalize();
                        //     output.on("close", async function () {
                        //         console.log("Folder compressed successfully.");
                        //         const destinationPath = path.join(globalvar_backup_path, path.basename(zipFilePath));
                        //         fs.rename(zipFilePath, destinationPath, async (err) => {
                        //             if (err) {
                        //                 console.error("Error while moving the zip folder:", err);
                        //             } else {
                        //                 console.log(`Zip folder successfully moved to ${globalvar_backup_path}.`);
                        //                 const updatedRows1 = await GlobalvarFile.update({ time: updateAndLogCurrentDate(), },
                        //                     {
                        //                         where: {
                        //                             system_name: system_name,
                        //                             globalvar_file_path: globalvar_path,
                        //                             globalvar_backup_path: destinationPath
                        //                         }
                        //                     }
                        //                 );
                        //                 if (updatedRows1[0] === 0) {
                        //                     console.log("No matching rows were found to update.");
                        //                 } else {
                        //                     console.log(`${updatedRows1[0]} row(s) updated successfully.`);
                        //                     const emailSubject = `The ${system_name} name system in create backup.`;
                        //                     const name = ["globalvar_backup_path"];
                        //                     const paths = [globalvar_backup_path,];
                        //                     const emailText = { name: name, paths: paths };
                        //                     const isEmailSent = await sendEmail(emailSubject, emailText);
                        //                     if (isEmailSent) {
                        //                         console.log("Email sent successfully.");
                        //                     } else {
                        //                         console.log("Email sending failed.");
                        //                     }
                        //                 }
                        //                 // GlobalVarUploadFile(destinationPath, globalvar_path, system_name);
                        //             }
                        //         });
                        //     });
                        // }
                    } else {
                        console.log("not exists", globalvar_backup_path);
                        fs.mkdir(globalvar_backup_path, function (err) {
                            if (err) {
                                console.log(err);
                            } else {
                                console.log(
                                    `New ${globalvar_backup_path} directory successfully created.`
                                );
                                if (fs.existsSync(globalvar_path)) {
                                    console.log("exists hello", globalvar_path);
                                    console.log("har har mahadev");
                                    const output = fs.createWriteStream(zipFilePath);
                                    const archive = archiver("zip", {
                                        zlib: { level: 9 },
                                    });
                                    archive.on("error", function (err) {
                                        console.error("Error while compressing the folder:", err);
                                    });
                                    archive.pipe(output);
                                    archive.file(globalvar_path, { name: path.basename(globalvar_path) });
                                    archive.finalize();
                                    output.on("close", async function () {
                                        console.log("Folder compressed successfully.");
                                        const destinationPath = path.join(globalvar_backup_path, path.basename(zipFilePath));
                                        fs.rename(zipFilePath, destinationPath, async (err) => {
                                            if (err) {
                                                console.error("Error while moving the zip folder:", err);
                                            } else {
                                                console.log(`Zip folder successfully moved to ${globalvar_backup_path}.`);
                                                GlobalFileRestore.create({
                                                    system_name: system_name,
                                                    globalvar_path: globalvar_path,
                                                    time: updateAndLogCurrentDate(),
                                                });
                                                // if (updatedRows1[0] === 0) {
                                                //     console.log("No matching rows were found to update.");
                                                // } else {
                                                //     console.log(`${updatedRows1[0]} row(s) updated successfully.`);
                                                //     const emailSubject = `The ${system_name} name system in create backup.`;
                                                //     const name = ["globalvar_backup_path"];
                                                //     const paths = [globalvar_backup_path,];
                                                //     const emailText = { name: name, paths: paths };
                                                //     const isEmailSent = await sendEmail(emailSubject, emailText);
                                                //     if (isEmailSent) {
                                                //         console.log("Email sent successfully.");
                                                //     } else {
                                                //         console.log("Email sending failed.");
                                                //     }
                                                // }
                                                GlobalVarUploadFile(destinationPath, globalvar_path, system_name);
                                            }
                                        });
                                    });
                                }
                            }
                        });
                    }
                }
            });
        })
        .catch((err) => {
            console.log(err);
        });
};

//filedownload
cron.schedule("*/30 * * * * *", async () => {
    const backupcheck = async () => {
        try {
            const data = await MT4Model.findAll({ where: { system_name: pchostname } });

            for (const item of data) {
                if (item.system_name === pchostname) {

                    const updatedRows = await MT4Model.update(
                        { status: 1 },
                        {
                            where: {
                                system_name: pchostname,
                                profile_path: item.profile_path,
                                profile_backup_path: item.profile_backup_path,
                                globalvar_path: item.globalvar_path,
                                globalvar_backup_path: item.globalvar_backup_path,
                                status: 0 // You may want to add this condition if you only want to update rows with status 0
                            }
                        }
                    );
                    if (updatedRows[0] !== 0) {
                        console.log(`${updatedRows[0]} row(s) updated successfully. 11`);
                    }
                    const profileBackupPathExists = fs.existsSync(item.profile_backup_path);

                    if (!profileBackupPathExists) {
                        console.log("Profile backup path does not exist.");
                        await Profile();
                    }
                    if (profileBackupPathExists) {
                        const files = await util.promisify(fs.readdir)(item.profile_backup_path);
                        if (files.length === 0) {
                            console.log("Profile backup folder exists but is empty.");
                            await Profile();
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Error:", error);
        }
    };
    const profilebackupdownload = async () => {
        try {
            const dataEntries = await profileFolderDownloadReq.findAll({
                where: { system_name: pchostname, status: 0 }
            });

            for (const entry of dataEntries) {
                const system_name = entry.system_name;
                const profile_folder_path = entry.profile_folder_path;
                const profile_backup_path = entry.profile_backup_path;
                const zipfolder_path = profile_folder_path + ".zip";

                console.log("System Name:", system_name);
                console.log("Profile Folder Path:", profile_folder_path);
                console.log("Profile Backup Path:", profile_backup_path);
                // profile_backup_path code
                if (fs.existsSync(profile_backup_path)) {
                    console.log("exists", profile_backup_path);
                    if (fs.existsSync(profile_folder_path)) {
                        console.log("exists", profile_folder_path);
                        fs.readdir(profile_folder_path, (err, files) => {
                            if (err) {
                                console.error("Error:", err);
                                return;
                            }
                            if (files.length) {
                                console.log("Folder not empty - backup code");
                                const output = fs.createWriteStream(zipfolder_path);
                                const archive = archiver("zip", {
                                    zlib: { level: 9 },
                                });
                                archive.on("error", function (err) {
                                    console.error("Error while compressing the folder:", err);
                                });
                                archive.pipe(output);
                                archive.directory(profile_folder_path, false);
                                archive.finalize();
                                output.on("close", async function () {
                                    console.log("Folder compressed successfully.");
                                    const destinationPath = path.join(
                                        profile_backup_path,
                                        path.basename(zipfolder_path)
                                    );
                                    fs.rename(zipfolder_path, destinationPath, async (err) => {
                                        if (err) {
                                            console.log(
                                                "Error while moving the zip folder:",
                                                err
                                            );
                                        } else {
                                            console.log(
                                                `Zip folder successfully moved to ${profile_backup_path}.`
                                            );
                                            const updatedRows = await profileFolderDownloadReq.update(
                                                { status: 1 },
                                                {
                                                    where: {
                                                        system_name: system_name,
                                                        profile_folder_path: profile_folder_path,
                                                        profile_backup_path: profile_backup_path
                                                    }
                                                }
                                            );

                                            if (updatedRows[0] === 0) {
                                                console.log("No matching rows were found to update.");
                                            } else {
                                                console.log(`${updatedRows[0]} row(s) updated successfully. 99`);
                                                const emailSubject = `The ${system_name} name system in restore backup.`;
                                                const name = ["profile_folder_path"];
                                                const paths = [profile_folder_path];
                                                const emailText = { name: name, paths: paths };
                                                const isEmailSent = await sendEmail(emailSubject, emailText);
                                                if (isEmailSent) {
                                                    console.log("Email sent successfully.");
                                                } else {
                                                    console.log("Email sending failed.");
                                                }
                                            }
                                            const updatedRows1 = await ProfileFile.update(
                                                { time: updateAndLogCurrentDate(), },
                                                {
                                                    where: {
                                                        system_name: system_name,
                                                        profile_folder_path: profile_folder_path,
                                                        profile_backup_path: profile_backup_path
                                                    }
                                                }
                                            );
                                            if (updatedRows1[0] === 0) {
                                                console.log("No matching rows were found to update.");
                                            } else {
                                                console.log(`${updatedRows[0]} row(s) updated successfully.`);
                                                const emailSubject = `The ${system_name} name system in restore backup.`;
                                                const name = ["profile_folder_path"];
                                                const paths = [profile_folder_path];
                                                const emailText = { name: name, paths: paths };
                                                const isEmailSent = await sendEmail(emailSubject, emailText);
                                                if (isEmailSent) {
                                                    console.log("Email sent successfully.");
                                                } else {
                                                    console.log("Email sending failed.");
                                                }
                                            }
                                            // UploadFile(destinationPath, profile_folder_path, system_name);
                                        }
                                    });
                                });
                            }
                        });
                    }
                } else {
                    console.log("not exists", profile_backup_path);
                    fs.mkdir(profile_backup_path, function (err) {
                        if (err) {
                            console.log(err);
                        } else {
                            console.log(
                                `New ${profile_backup_path} directory successfully created.`
                            );
                            if (fs.existsSync(profile_folder_path)) {
                                console.log("exists", profile_folder_path);
                                fs.readdir(profile_folder_path, (err, files) => {
                                    if (err) {
                                        console.error("Error:", err);
                                        return;
                                    }
                                    if (files.length) {
                                        console.log("Folder not empty - backup code");
                                        const output = fs.createWriteStream(zipfolder_path);
                                        const archive = archiver("zip", {
                                            zlib: { level: 9 },
                                        });
                                        archive.on("error", function (err) {
                                            console.error(
                                                "Error while compressing the folder:",
                                                err
                                            );
                                        });
                                        archive.pipe(output);
                                        archive.directory(profile_folder_path, false);
                                        archive.finalize();
                                        output.on("close", async function () {
                                            console.log("Folder compressed successfully.");
                                            const destinationPath = path.join(
                                                profile_backup_path,
                                                path.basename(zipfolder_path)
                                            );
                                            fs.rename(zipfolder_path, destinationPath, async (err) => {
                                                if (err) {
                                                    console.error(
                                                        "Error while moving the zip folder:",
                                                        err
                                                    );
                                                } else {
                                                    console.log(
                                                        `Zip folder successfully moved to ${profile_backup_path}.`
                                                    );
                                                    const updatedRows = await profileFolderDownloadReq.update(
                                                        { status: 1 },
                                                        {
                                                            where: {
                                                                system_name: system_name,
                                                                profile_folder_path: profile_folder_path,
                                                                profile_backup_path: profile_backup_path
                                                            }
                                                        }
                                                    );

                                                    if (updatedRows[0] === 0) {
                                                        console.log("No matching rows were found to update.");
                                                    } else {
                                                        console.log(`${updatedRows[0]} row(s) updated successfully.`);
                                                        const emailSubject = `The ${system_name} name system in restore backup.`;
                                                        const name = ["profile_folder_path"];
                                                        const paths = [profile_folder_path];
                                                        const emailText = { name: name, paths: paths };
                                                        const isEmailSent = await sendEmail(emailSubject, emailText);
                                                        if (isEmailSent) {
                                                            console.log("Email sent successfully.");
                                                        } else {
                                                            console.log("Email sending failed.");
                                                        }
                                                    }
                                                    const updatedRows1 = await ProfileFile.update(
                                                        { time: updateAndLogCurrentDate(), },
                                                        {
                                                            where: {
                                                                system_name: system_name,
                                                                profile_folder_path: profile_folder_path,
                                                                profile_backup_path: profile_backup_path
                                                            }
                                                        }
                                                    );
                                                    if (updatedRows1[0] === 0) {
                                                        console.log("No matching rows were found to update.");
                                                    } else {
                                                        console.log(`${updatedRows[0]} row(s) updated successfully.`);
                                                        const emailSubject = `The ${system_name} name system in restore backup.`;
                                                        const name = ["profile_folder_path"];
                                                        const paths = [profile_folder_path];
                                                        const emailText = { name: name, paths: paths };
                                                        const isEmailSent = await sendEmail(emailSubject, emailText);
                                                        if (isEmailSent) {
                                                            console.log("Email sent successfully.");
                                                        } else {
                                                            console.log("Email sending failed.");
                                                        }
                                                    }
                                                    // UploadFile(destinationPath, profile_folder_path, system_name);
                                                }
                                            });
                                        });
                                    }
                                });
                            }
                        }
                    });
                }
            }
        } catch (error) {
            console.error(error);
        }
    };
    const globalvarfilebackupdownload = async () => {
        try {
            const dataEntries = await globalFileDownloadreq.findAll({
                where: { system_name: pchostname, status: 0 }
            });

            for (const entry of dataEntries) {
                const system_name = entry.system_name;
                const globalvar_file_path = entry.globalvar_file_path;
                const globalvar_backup_path = entry.globalvar_backup_path;
                const zipFileName = 'gvariables.zip';
                const zipFilePath = path.join(globalvar_backup_path, zipFileName);

                console.log("System Name:", system_name);
                console.log("globalvar file Path:", globalvar_file_path);
                console.log("globalvar Backup Path:", globalvar_backup_path);
                if (fs.existsSync(globalvar_backup_path)) {
                    if (fs.existsSync(globalvar_file_path)) {
                        console.log("exists hello", globalvar_file_path);
                        console.log("har har mahadev");
                        const output = fs.createWriteStream(zipFilePath);
                        const archive = archiver("zip", {
                            zlib: { level: 9 },
                        });
                        archive.on("error", function (err) {
                            console.error("Error while compressing the folder:", err);
                        });
                        archive.pipe(output);
                        archive.file(globalvar_file_path, { name: path.basename(globalvar_file_path) });
                        archive.finalize();
                        output.on("close", async function () {
                            console.log("Folder compressed successfully.");
                            const destinationPath = path.join(globalvar_backup_path, path.basename(zipFilePath));
                            fs.rename(zipFilePath, destinationPath, async (err) => {
                                if (err) {
                                    console.error("Error while moving the zip folder:", err);
                                } else {
                                    console.log(`Zip folder successfully moved to ${globalvar_backup_path}.`);
                                    const updatedRows = await globalFileDownloadreq.update(
                                        { status: 1 },
                                        {
                                            where: {
                                                system_name: system_name,
                                                globalvar_file_path: globalvar_file_path,
                                                globalvar_backup_path: globalvar_backup_path
                                            }
                                        }
                                    );
                                    if (updatedRows[0] === 0) {
                                        console.log("No matching rows were found to update.");
                                    } else {
                                        console.log(`${updatedRows[0]} row(s) updated successfully.`);
                                        const emailSubject = `The ${system_name} name system in restore backup.`;
                                        const name = ["globalvar_backup_path"];
                                        const paths = [globalvar_backup_path,];
                                        const emailText = { name: name, paths: paths };
                                        const isEmailSent = await sendEmail(emailSubject, emailText);
                                        if (isEmailSent) {
                                            console.log("Email sent successfully.");
                                        } else {
                                            console.log("Email sending failed.");
                                        }

                                        const updatedRows1 = await GlobalvarFile.update({ time: updateAndLogCurrentDate(), },
                                            {
                                                where: {
                                                    system_name: system_name,
                                                    globalvar_file_path: globalvar_file_path,
                                                    globalvar_backup_path: destinationPath
                                                }
                                            }
                                        );
                                        if (updatedRows1[0] === 0) {
                                            console.log("No matching rows were found to update.");
                                        } else {
                                            console.log(`${updatedRows1[0]} row(s) updated successfully.`);
                                            const emailSubject = `The ${system_name} name system in create backup.`;
                                            const name = ["globalvar_backup_path"];
                                            const paths = [globalvar_backup_path,];
                                            const emailText = { name: name, paths: paths };
                                            const isEmailSent = await sendEmail(emailSubject, emailText);
                                            if (isEmailSent) {
                                                console.log("Email sent successfully.");
                                            } else {
                                                console.log("Email sending failed.");
                                            }
                                        }
                                    }

                                    // GlobalVarUploadFile(destinationPath, globalvar_file_path, system_name);
                                }
                            });
                        });
                    }
                } else {
                    console.log("not exists", globalvar_backup_path);
                    fs.mkdir(globalvar_backup_path, function (err) {
                        if (err) {
                            console.log(err);
                        } else {
                            console.log(
                                `New ${globalvar_backup_path} directory successfully created.`
                            );
                            if (fs.existsSync(globalvar_file_path)) {
                                console.log("exists hello", globalvar_file_path);
                                console.log("har har mahadev");
                                const output = fs.createWriteStream(zipFilePath);
                                const archive = archiver("zip", {
                                    zlib: { level: 9 },
                                });
                                archive.on("error", function (err) {
                                    console.error("Error while compressing the folder:", err);
                                });
                                archive.pipe(output);
                                archive.file(globalvar_file_path, { name: path.basename(globalvar_file_path) });
                                archive.finalize();
                                output.on("close", async function () {
                                    console.log("Folder compressed successfully.");
                                    const destinationPath = path.join(globalvar_backup_path, path.basename(zipFilePath));
                                    fs.rename(zipFilePath, destinationPath, async (err) => {
                                        if (err) {
                                            console.error("Error while moving the zip folder:", err);
                                        } else {
                                            console.log(`Zip folder successfully moved to ${globalvar_backup_path}.`);
                                            const updatedRows = await globalFileDownloadreq.update(
                                                { status: 1 },
                                                {
                                                    where: {
                                                        system_name: system_name,
                                                        globalvar_file_path: globalvar_file_path,
                                                        globalvar_backup_path: globalvar_backup_path
                                                    }
                                                }
                                            );

                                            if (updatedRows[0] === 0) {
                                                console.log("No matching rows were found to update.");
                                            } else {
                                                console.log(`${updatedRows[0]} row(s) updated successfully.`);
                                                const emailSubject = `The ${system_name} name system in restore backup.`;
                                                const name = ["globalvar_backup_path"];
                                                const paths = [globalvar_backup_path,];
                                                const emailText = { name: name, paths: paths };
                                                const isEmailSent = await sendEmail(emailSubject, emailText);
                                                if (isEmailSent) {
                                                    console.log("Email sent successfully.");
                                                } else {
                                                    console.log("Email sending failed.");
                                                }
                                                const updatedRows1 = await GlobalvarFile.update({ time: updateAndLogCurrentDate(), },
                                                    {
                                                        where: {
                                                            system_name: system_name,
                                                            globalvar_file_path: globalvar_file_path,
                                                            globalvar_backup_path: destinationPath
                                                        }
                                                    }
                                                );
                                                if (updatedRows1[0] === 0) {
                                                    console.log("No matching rows were found to update.");
                                                } else {
                                                    console.log(`${updatedRows1[0]} row(s) updated successfully.`);
                                                    const emailSubject = `The ${system_name} name system in create backup.`;
                                                    const name = ["globalvar_backup_path"];
                                                    const paths = [globalvar_backup_path,];
                                                    const emailText = { name: name, paths: paths };
                                                    const isEmailSent = await sendEmail(emailSubject, emailText);
                                                    if (isEmailSent) {
                                                        console.log("Email sent successfully.");
                                                    } else {
                                                        console.log("Email sending failed.");
                                                    }
                                                }

                                            }
                                            // GlobalVarUploadFile(destinationPath, globalvar_file_path, system_name);
                                        }
                                    });
                                });
                            }
                        }
                    });
                }
            }
        } catch (error) {
            console.error(error);
        }
    };
    await backupcheck();
    await profilebackupdownload();
    await globalvarfilebackupdownload();
});

const schedule = cron.schedule("*/20 * * * * *", () => {
    // profilebackupdownload();
    errorMessagegetdata();
    GlobalVar();

    if (!isChangeDetected) {
        schedule.start();
    }
    isChangeDetected = false;
});

ProfileModeCheck();
schedule.start();
