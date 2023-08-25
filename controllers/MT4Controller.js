const db = require("../models");
const MT4Model = db.MT4Model;
const ProfileFile = db.ProfileFile;
const GlobalvarFile = db.GlobalvarFile;
const MT4App = db.MT4App;
const MT4ErrorLogLists = db.MT4ErrorLogList;
const ProfileFolderRestore = db.ProfileFolderRestore;
const GlobalFileRestore = db.GlobalFileRestore;
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
const AdmZip = require('adm-zip');
const fs = require('fs');
const fsExtra = require('fs-extra');
const path = require("path");
// var ip = require('ip');
// const myip = ip.address();
const { where } = require("sequelize");

const index = (req, res) => {
    const MT4data = req.session.MT4data ? req.session.MT4data : {};
    delete req.session.MT4data;
    return res.render("MT4/MT4Page", { user: JSON.stringify(req.user), MT4data: MT4data });
};
const MT4PageData = async (req, res) => {
    try {
        const system_name = req.body.system_name;
        const profile_path = req.body.profile_folder_path.replace(/\\/g, "/");
        const profile_backup_path = req.body.profile_backupfolder_path.replace(/\\/g, "/");
        const globalvar_path = req.body.globalvar_folder_path.replace(/\\/g, "/");
        const globalvar_backup_path = req.body.globalvar_backupfolder_path.replace(/\\/g, "/");
        req.session.MT4data = req.body;

        if (!system_name) {
            req.flash("error", "System Name is required");
            return res.redirect("back");
        }
        if (!profile_path) {
            req.flash("error", "Profile Folder Path is required");
            return res.redirect("back");
        }
        const directoryPathRegex = /^(?:[a-zA-Z]:)?(?:\/[^<>:"/\\|?*]+)*\/?$/;
        const isValidDirectoryPath = directoryPathRegex.test(profile_path);
        console.log(isValidDirectoryPath);
        if (!isValidDirectoryPath) {
            req.flash("error", "Profile Folder Path is wrong");
            return res.redirect("back");
        }
        if (!profile_backup_path) {
            req.flash("error", "Profile BackUp Folder Path is required");
            return res.redirect("back");
        }
        if (!globalvar_path) {
            req.flash("error", "Global Variable Folder Path is required");
            return res.redirect("back");
        }
        const fileFormatRegex = /\.(dat)$/i;
        const isValidglobalvarpath = fileFormatRegex.test(globalvar_path);;
        if (!isValidglobalvarpath) {
            req.flash("error", "Global Variable Folder Path is wrong");
            return res.redirect("back");
        }
        if (!globalvar_backup_path) {
            req.flash("error", "Global Variable BackUp Folder Path is required");
            return res.redirect("back");
        }
        const ipfound = await MT4Model.findOne({ where: { profile_path: profile_path, globalvar_path: globalvar_path, } });
       
        if (!ipfound) {
            // Insert data into the database
            await MT4Model.create({
                system_name: system_name,
                profile_path: profile_path,
                profile_backup_path: profile_backup_path,
                globalvar_path: globalvar_path,
                globalvar_backup_path: globalvar_backup_path
            });

            console.log("Data inserted successfully");
            // Send email
            const emailSubject = `Profiles Folder and gvariables File Configuration on Machine ${system_name}`;
            const emailText = `
Hello Team,<br>
<br>
Profiles Folder and gvariables file have been configured on ${updateAndLogCurrentDate()} on Machine ${system_name}. Below are the details:<br>
<br>
- Profiles Folder Path: ${profile_path}<br>
- Profiles Folder Backup Path: ${profile_backup_path}<br>
- gvariables File Path: ${globalvar_path}<br>
- gvariables Backup Folder Path: ${globalvar_backup_path}<br>
<br>
Thank you!
`;

            const isEmailSent = await sendEmail(emailSubject, emailText);

            if (isEmailSent) {
                console.log("Email sent successfully.");
            } else {
                console.log("Email sending failed.");
            }
            req.flash('success', 'Data inserted successfully');
            delete req.session.MT4data;
            return res.redirect("back");
        } else {
            req.flash('success', "Data already exists");
            delete req.session.MT4data;
            return res.redirect("back");
        }
    } catch (error) {
        console.error("Error inserting data:", error);
        req.flash('error', 'Error inserting data');
    }
    //     if (!ipfound) {
    //         MT4Model.create(
    //             {
    //                 system_name: system_name,
    //                 profile_path: profile_path,
    //                 profile_backup_path: profile_backup_path,
    //                 globalvar_path: globalvar_path,
    //                 globalvar_backup_path: globalvar_backup_path,
    //             },
    //             async (err) => {
    //                 if (err) {
    //                     delete req.session.MT4data;
    //                     console.log("err 1");
    //                     req.flash('error', 'Error data inserting');
    //                     return res.redirect("back");
    //                 } else {

    //                     console.log("data inserted successfully");

    //                     const emailSubject = `Add New Istants to MT4 in this system ${system_name}`;
    //                     const name = ["profile_path", "profile_backup_path", "globalvar_path", "globalvar_backup_path"];
    //                     const paths = [profile_path, profile_backup_path, globalvar_path, globalvar_backup_path];
    //                     const emailText = { name: name, paths: paths };
    //                     const isEmailSent = await sendEmail(emailSubject, emailText);
    //                     if (isEmailSent) {
    //                         console.log("Email sent successfully.");
    //                     } else {
    //                         console.log("Email sending failed.");
    //                     }
    //                     delete req.session.MT4data;
    //                     req.flash('success', 'data inserted successfully');
    //                     return res.redirect("back");
    //                 }
    //             }
    //         );
    //         delete req.session.MT4data;
    //     } else {
    //         delete req.session.MT4data;
    //         req.flash('success', "data alrady exists");
    //         return res.redirect("back");
    //     }
    // } catch (error) {
    //     console.error("Error inserting data:", error);
    //     delete req.session.MT4data;
    //     req.flash('error', 'Error inserting data');
    //     return res.redirect("back");
    // }
};
const MT4ViewPage = async (req, res) => {
    try {
        const page = req.params.page || 1;
        const limit = 10;
        const offset = (page - 1) * limit;
        const { count, rows: MT4view } = await MT4Model.findAndCountAll({
            attributes: { exclude: ["createdAt", "updatedAt"] },
            offset: offset,
            limit: limit,
            order: [['createdAt', 'DESC']]
        });
        return res.render("Mt4/MT4ViewPage", {
            all: MT4view,
            current: page,
            pages: Math.ceil(count / limit),
            user: JSON.stringify(req.user),
        });
    } catch (error) {
        console.log("Error retrieving User", error);
        req.flash("error", "Error retrieving User");
        return res.redirect("back");
    }
};
const MT4EditPageView = async (req, res) => {
    try {
        let id = req.params.eid;
        const MT4data = await MT4Model.findOne({ where: { id: id } });

        if (!MT4data) {
            console.log("Record not found");
            req.flash("error", "Record not found");
            return res.redirect("/MT4ViewPage");
        }
        return res.render("MT4/MT4EditApp", {
            Edit: MT4data,
            user: JSON.stringify(req.user),
        });
    } catch (error) {
        console.log("Error retrieving appview", error);
        req.flash("error", "Error retrieving editpage");
        return res.redirect("back");
    }
};
const MT4EditPage = async (req, res) => {
    const id = req.body.editid;
    const system_name = req.body.system_name;
    const profile_path = req.body.profile_folder_path.replace(/\\/g, "/");
    const profile_backup_path = req.body.profile_backupfolder_path.replace(/\\/g, "/");
    const globalvar_path = req.body.globalvar_folder_path.replace(/\\/g, "/");
    const globalvar_backup_path = req.body.globalvar_backupfolder_path.replace(/\\/g, "/");

    if (!system_name) {
        req.flash("error", "System Name is required");
        return res.redirect("back");
    }
    if (!profile_path) {
        req.flash("error", "Profile Folder Path is required");
        return res.redirect("back");
    }
    const directoryPathRegex = /^(?:[a-zA-Z]:)?(?:\/[^<>:"/\\|?*]+)*\/?$/;
    const isValidDirectoryPath = directoryPathRegex.test(profile_path);
    console.log(isValidDirectoryPath);
    if (!isValidDirectoryPath) {
        req.flash("error", "Profile Folder Path is wrong");
        return res.redirect("back");
    }
    if (!profile_backup_path) {
        req.flash("error", "Profile BackUp Folder Path is required");
        return res.redirect("back");
    }
    if (!globalvar_path) {
        req.flash("error", "Global Variable Folder Path is required");
        return res.redirect("back");
    }
    const fileFormatRegex = /\.(dat)$/i;
    const isValidglobalvarpath = fileFormatRegex.test(globalvar_path);;
    if (!isValidglobalvarpath) {
        req.flash("error", "Global Variable Folder Path is wrong");
        return res.redirect("back");
    }
    if (!globalvar_backup_path) {
        req.flash("error", "Global Variable BackUp Folder Path is required");
        return res.redirect("back");
    }
    try {
        const result = await MT4Model.update(
            {
                system_name: system_name,
                profile_path: profile_path,
                profile_backup_path: profile_backup_path,
                globalvar_path: globalvar_path,
                globalvar_backup_path: globalvar_backup_path,
                status: 0
            },
            { where: { id: id } }
        );
        console.log("Rows affected:", result[0]); // Check the number of affected rows
        req.flash("success", "Record Successfully Updated");
        console.log("Record successfully updated");
        return res.redirect("/MT4ViewPage");
    } catch (error) {
        req.flash("error", "Record Not Updated, Something Went Wrong");
        console.log("Error updating record", error);
        return res.redirect("back");
    }
};
const MT4Delete = async (req, res) => {
    let id = req.params.did;
    try {
        let deletedata = await MT4Model.destroy({ where: { id: id } });

        if (deletedata) {
            req.flash("success", "Record Successfully Deleted");
            console.log("Record successfully delete");
            return res.redirect("back");
        } else {
            req.flash("error", "Record Not Deleted ");
            console.log("Record not successfully delete");
            return res.redirect("back");
        }
    } catch (err) {
        console.log(err);
        req.flash("error", "Error deleting record");
        return res.redirect("back");
    }
};
const MT4ProfileBackUpList = async (req, res) => {
    try {
        const page = req.params.page || 1;
        const limit = 10;
        const offset = (page - 1) * limit;
        const { count, rows: MT4ProfileBackUp } = await ProfileFile.findAndCountAll({
            attributes: { exclude: ['createdAt', 'updatedAt'] },
            offset: offset,
            limit: limit,
            order: [['createdAt', 'DESC']]
        });
        return res.render("MT4/MT4BackupPage", {
            allapp: MT4ProfileBackUp,
            current: page,
            pages: Math.ceil(count / limit),
            user: JSON.stringify(req.user),
        });
    } catch (error) {
        console.log("Error retrieving appview", error);
        req.flash('error', 'Error retrieving appview');
        return res.redirect("back");
    }
};
const MT4GlobalvarBackUpList = async (req, res) => {
    try {
        const page = req.params.page || 1;
        const limit = 10;
        const offset = (page - 1) * limit;
        const { count, rows: MT4ProfileBackUp } = await GlobalvarFile.findAndCountAll({
            attributes: { exclude: ['createdAt', 'updatedAt'] },
            offset: offset,
            limit: limit,
            order: [['createdAt', 'DESC']]
        });
        return res.render("MT4/GlobalvarBackUpList", {
            allapp: MT4ProfileBackUp,
            current: page,
            pages: Math.ceil(count / limit),
            user: JSON.stringify(req.user),
        });
    } catch (error) {
        console.log("Error retrieving appview", error);
        req.flash('error', 'Error retrieving appview');
        return res.redirect("back");
    }
};
const MT4AppLogList = async (req, res) => {
    try {
        const page = req.params.page || 1;
        const limit = 10;
        const offset = (page - 1) * limit;
        const { count, rows: alldata } = await MT4App.findAndCountAll({
            attributes: { exclude: ['createdAt', 'updatedAt'] },
            offset: offset,
            limit: limit,
            order: [['createdAt', 'DESC']]
        });

        return res.render("MT4/MT4AppLogList", {
            allapp: alldata,
            current: page,
            pages: Math.ceil(count / limit),
            user: JSON.stringify(req.user),
        });
    } catch (error) {
        console.log("Error retrieving appview", error);
        req.flash('error', 'Error retrieving appview');
        return res.redirect("back");
    }
};
const MT4ErorrLogList = async (req, res) => {
    try {
        const page = req.params.page || 1;
        const limit = 10;
        const offset = (page - 1) * limit;
        const { count, rows: MT4ErrorLogList } = await MT4ErrorLogLists.findAndCountAll({
            attributes: { exclude: ['createdAt', 'updatedAt'] },
            offset: offset,
            limit: limit,
            order: [['createdAt', 'DESC']]
        });
        return res.render("MT4/MT4ErrorLogListPage.ejs", {
            allapp: MT4ErrorLogList,
            current: page,
            pages: Math.ceil(count / limit),
            user: JSON.stringify(req.user),
        });
    } catch (error) {
        console.log("Error retrieving appview", error);
        req.flash('error', 'Error retrieving appview');
        return res.redirect("back");
    }
};
const MT4ProfileFolderRestoreList = async (req, res) => {
    try {
        const page = req.params.page || 1;
        const limit = 10;
        const offset = (page - 1) * limit;
        const { count, rows: alldata } = await ProfileFolderRestore.findAndCountAll({
            attributes: { exclude: ['createdAt', 'updatedAt'] },
            offset: offset,
            limit: limit,
            order: [['createdAt', 'DESC']]
        });

        return res.render("MT4/MT4ProfileFolderRestoreList", {
            allapp: alldata,
            current: page,
            pages: Math.ceil(count / limit),
            user: JSON.stringify(req.user),
        });
    } catch (error) {
        console.log("Error retrieving appview", error);
        req.flash('error', 'Error retrieving appview');
        return res.redirect("back");
    }
};
const MT4GlobalFileRestoreList = async (req, res) => {
    try {
        const page = req.params.page || 1;
        const limit = 10;
        const offset = (page - 1) * limit;
        const { count, rows: alldata } = await GlobalFileRestore.findAndCountAll({
            attributes: { exclude: ['createdAt', 'updatedAt'] },
            offset: offset,
            limit: limit,
            order: [['createdAt', 'DESC']]
        });

        return res.render("MT4/MT4GlobalFileRestoreList.ejs", {
            allapp: alldata,
            current: page,
            pages: Math.ceil(count / limit),
            user: JSON.stringify(req.user),
        });
    } catch (error) {
        console.log("Error retrieving appview", error);
        req.flash('error', 'Error retrieving appview');
        return res.redirect("back");
    }
};
module.exports = {
    index, MT4PageData, MT4ViewPage, MT4EditPageView, MT4EditPage, MT4Delete, MT4ProfileBackUpList, MT4GlobalvarBackUpList, MT4AppLogList, MT4ErorrLogList, MT4ProfileFolderRestoreList, MT4GlobalFileRestoreList
};