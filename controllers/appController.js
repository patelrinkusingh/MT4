const fs = require("fs");
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const { execSync } = require("child_process");
const date = new Date();
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
const currentDate = date.toLocaleString("en-IN", options);

const db = require("../models");
// create main Model
const appregisters = db.appregisters;
const apprunmodel = db.apprunmodel;
const { AppSchema } = require("../config/validation_schema");

const index = (req, res) => {
    const formData = req.session.formData ? req.session.formData : {};
    delete req.session.formData;
    
    res.render("app", { user: JSON.stringify(req.user), formData: formData });
};
const appname = async (req, res) => {
    let name = req.body.name;
    let path = req.body.path.replace(/\\/g, "/");
    req.session.formData = req.body;
    if (name !== "") {
        if (path !== "") {
            if (fs.existsSync(path)) {
                if (path.toLowerCase().endsWith(".exe")) {
                    path = path.slice(0, -4) + ".exe";
                    const data = await appregisters.findOne({ where: { name: name, path: path } });
                    if (data) {
                        try {
                            console.log("checkIfAppIsRunning");
                            const { stdout } = await exec(
                                "wmic process get Caption, ExecutablePath"
                            );
                            if (!stdout) {
                                console.error("No output from command");
                                return;
                            }
                            const processArray = stdout
                                .trim()
                                .split("\r\r\n")
                                .slice(1)
                                .map((line) => {
                                    const [name, path] = line.trim().split(/\s{2,}/);
                                    return { name, path: path ? path.replace(/\\/g, "/") : null };
                                });
                            const matchingProcesses = processArray.filter((process) => {
                                return process.path === path || process.name === name;
                            });
                            if (matchingProcesses.length > 0) {
                                delete req.session.formData;
                                req.flash("error", "App is already running");
                                return res.redirect("/appPage");
                            }
                        } catch (err) {
                            console.error(err);
                            res.status(500).send("Internal Server Error");
                        }
                    } else {
                        try {
                            console.log("createAppRecord");
                            const apps = await appregisters.findAll({});
                            const appExists = apps.some((app) => app.path === path);
                            if (appExists.path === path) {
                                delete req.session.formData;
                                req.flash("success", "This application already added");
                                res.redirect("/appPage");
                            } else {
                                try {
                                    const apps = await appregisters.findAll({});
                                    const appExists = apps.some((app) => app.path === path);
                                    if (appExists) {
                                        delete req.session.formData;
                                        req.flash("success", "This application already exists");
                                        console.log("createAppRecord");
                                        return res.redirect("/appPage");
                                    } else {
                                        const newApp = await appregisters.create({ name, path });
                                        req.flash("success", "Application Add");
                                        await apprunmodel.create({
                                            App_Name: name,
                                            App_Path: path,
                                            App_Start_Time: currentDate,
                                        });
                                        try {
                                            console.log("checkIfAppIsRunning");
                                            const { stdout } = await exec(
                                                "wmic process get Caption, ExecutablePath"
                                            );
                                            if (!stdout) {
                                                console.error("No output from command");
                                                req.flash("error", "Error starting app");
                                                return res.redirect("/appPage");
                                            }
                                            const processArray = stdout
                                                .trim()
                                                .split("\r\r\n")
                                                .slice(1)
                                                .map((line) => {
                                                    const [name, path] = line.trim().split(/\s{2,}/);
                                                    return {
                                                        name,
                                                        path: path ? path.replace(/\\/g, "/") : null,
                                                    };
                                                });
                                            const matchingProcesses = processArray.filter(
                                                (process) => {
                                                    return process.path === path || process.name === name;
                                                }
                                            );
                                            if (matchingProcesses.length > 0) {
                                                delete req.session.formData;
                                                req.flash("error", "App is already running");
                                                return res.redirect("/appPage");
                                            } else {
                                                delete req.session.formData;
                                                req.flash("success", "App is started");
                                                return res.redirect("/appPage");
                                            }
                                        } catch (err) {
                                            console.error(`Error starting app: ${err}`);
                                            req.flash("error", "Error starting app");
                                            res.redirect("/appPage");
                                        }
                                        return res.redirect("/appPage");
                                    }
                                } catch (err) {
                                    console.error(`Error creating app record: ${err}`);
                                    req.flash("error", "Error creating app record");
                                    return res.redirect("/appPage");
                                }
                            }
                        } catch (err) {
                            console.error(`Error creating app record: ${err}`);
                            req.flash("error", "Error creating app record");
                            return res.redirect("/appPage");
                        }
                    }
                }
            } else {
                req.flash("error", "Path is wrong");
                return res.redirect("back");
            }
        } else {
            req.flash("error", "Path is required");
            return res.redirect("back");
        }
    } else {
        req.flash("error", "Name is required");
        return res.redirect("back");
    }
    delete req.session.formData;
    return res.redirect("back");
};
const addappview = async (req, res) => {
    try {
        const page = req.params.page || 1;
        const limit = 10;
        const offset = (page - 1) * limit;
        const { count, rows: appview } = await appregisters.findAndCountAll({
            attributes: { exclude: ['createdAt', 'updatedAt'] },
            offset: offset,
            limit: limit,
        });
        return res.render("appview", {
            all: appview,
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
const appeditpage = async (req, res) => {
    try {
        let id = req.params.eid;
        const EditRecord = await appregisters.findOne({ where: { id: id } });
        if (!EditRecord) {
            console.log("Record not found");
            req.flash('error', 'Record not found');
            return res.redirect("/AppPage");
        }
        return res.render("EditApp", {
            Edit: EditRecord,
            user: JSON.stringify(req.user),
        });
    } catch (error) {
        console.log("Error retrieving appview", error);
        req.flash('error', 'Error retrieving appeditpage');
        return res.redirect("back");
    }
};
const appedit = async(req, res) => {
    let id = req.body.editid;
    let name = req.body.name;
    let path = req.body.path;
    if (!name) {
        req.flash("error", "App Name are required");
        res.redirect("back");
    } else {
        if (!path) {
            req.flash("error", "App Path are required");
            res.redirect("back");
        } else {
            if (fs.existsSync(path)) {
                if (path.toLowerCase().endsWith(".exe")) {
                    path = path.slice(0, -4) + ".exe";
                    try {
                        await appregisters.update(
                            { name: name, path: path },
                            { where: { id: id } }
                        );
                        req.flash("success", "Record Successfully Update");
                        console.log("Record successfully updated");
                        return res.redirect("/addappview");
                    } catch (error) {
                        req.flash("error", "Record Not Update Somthing Wrong");
                        console.log("Record not updated", error);
                        return false;
                    }
                }
            } else {
                req.flash("error", "Path is wrong");
                return res.redirect(`back`);
            }
        }
    }
};
const appdelete = async (req, res) => {
    let id = req.params.did;
    try {
        let deletedata = await appregisters.destroy({ where: { id: id }});

        if (deletedata) {
            // Delete all data from RunAppModel with the same App_Name as the deleted app
            // await AppRunModel.deleteMany({ App_Name: deletedata.name });
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
const apprunlist = async (req, res) => {
    try {
        const limit = 10;
        const page = req.params.page || 1;
        const { count, rows: runappview } = await apprunmodel.findAndCountAll({
            attributes: { exclude: ['createdAt', 'updatedAt'] },
            limit: limit,
        });
        return res.render("runappview", {
            allapp: runappview,
            current: page,
            pages: Math.ceil(count / limit),
            user: JSON.stringify(req.user),
        });
    } catch (err) {
        console.log(err);
    }
};

module.exports = {
    index,
    appname,
    apprunlist,
    appedit,
    appeditpage,
    addappview,
    appdelete,
};