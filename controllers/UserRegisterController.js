const db = require("../models");
const jwtData = require("jsonwebtoken");
// create main Model
const bcrypt = require("bcrypt");
const Register = db.registers;
const {
    UserregisterSchema,
    UserEditSchema,
} = require("../config/validation_schema");

const index = (req, res) => {
    const registerdata = req.session.registerdata ? req.session.registerdata : {};
    res.render("register", { user: JSON.stringify(req.user), registerdata });
};
const UserLoginData = async (req, res, next) => {
    try {
        const fname = req.body.fname;
        const lname = req.body.lname;
        const email = req.body.email;
        const password = req.body.password;
        const cpassword = req.body.cpassword;
        const role = req.body.field;
        req.session.registerdata = req.body;
        const result = await UserregisterSchema.validateAsync(req.body);
        const existingUser = await Register.findOne({ where: { email: email } });
        if (existingUser) {
            req.flash(
                "error",
                "This email is already in use. Please enter a different email."
            );
            return res.redirect("back");
        }
        console.log(result);
        if (password !== cpassword) {
            req.flash("error", "Passwords do not match");
            return res.redirect("back");
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const hashedCPassword = await bcrypt.hash(cpassword, 10);
        const token = jwtData.sign(result, "MAULIK", { expiresIn: "1day" });
        const data = {
            fname: fname,
            lname: lname,
            email: email,
            password: hashedPassword,
            cpassword: hashedCPassword,
            field: role,
            token: token,
        };
        const createdUser = await Register.create(data);
        if (createdUser) {
            console.log("User created successfully");
            req.headers.authorization = `Bearer ${token}`;
            return res.redirect("/AppPage");
        } else {
            console.log("Error creating user");
            req.flash("error", "Error creating user");
            return res.redirect("back");
        }
    } catch (err) {
        console.log(err);
        const errorMessage = err.details[0].message || err;
        req.flash("error", errorMessage);
        return res.redirect("back");
    }
};
const registerview = async (req, res) => {
    try {
        const page = req.params.page || 1;
        const limit = 10;
        const offset = (page - 1) * limit;
        const { count, rows: appview } = await Register.findAndCountAll({
            attributes: { exclude: ["createdAt", "updatedAt"] },
            offset: offset,
            limit: limit,
        });
        return res.render("registerview", {
            all: appview,
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
const registereditpage = async (req, res) => {
    try {
        const registereditdata = req.session.registereditdata
            ? req.session.registereditdata
            : {};
        console.log(registereditdata);
        delete req.session.registereditdata;
        let id = req.params.eid;
        const EditRecord = await Register.findOne({ where: { id: id } });
        if (!EditRecord) {
            console.log("Record not found");
            req.flash("error", "Record not found");
            return res.redirect("/AppPage");
        }
        return res.render("registerEdit.ejs", {
            Edit: EditRecord,
            user: JSON.stringify(req.user),
            registereditdata,
        });
    } catch (error) {
        console.log("Error retrieving appview", error);
        req.flash("error", "Error retrieving appeditpage");
        return res.redirect("back");
    }
};
const registeredit = async (req, res) => {
    let id = req.body.editid;
    const fname = req.body.fname;
    const lname = req.body.lname;
    const email = req.body.email;
    const password = req.body.password;
    const cpassword = req.body.cpassword;
    const role = req.body.field;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    req.session.registereditdata = req.body;
    if (!fname) {
        req.flash('error', 'First name is required');
        return res.redirect('back');
    }
    if (!lname) {
        req.flash('error', 'Last name is required');
        return res.redirect('back');
    }
    if (!email) {
        req.flash('error', 'Email is required');
        return res.redirect('back');
    }
    if (!emailRegex.test(email)) {
        req.flash("error", "Please enter a valid email");
        return res.redirect('back');
    }
    if (!role) {
        req.flash('error', 'pls select any one role');
        return res.redirect('back');
    }
    const token = jwtData.sign(req.body, "MAULIK", { expiresIn: "1day" });
    if (password || cpassword) {
        if (!password) {
            req.flash('error', 'Password is required');
            return res.redirect('back');
        }
        if (!cpassword) {
            req.flash('error', 'Confirm password is required');
            return res.redirect('back');
        }
        if (password !== cpassword) {
            req.flash('error', 'Passwords do not match');
            return res.redirect('back');
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const hashedCPassword = await bcrypt.hash(cpassword, 10);
        const data = {
            fname: fname,
            lname: lname,
            email: email,
            password: hashedPassword,
            cpassword: hashedCPassword,
            field: role,
            token: token,
        };
        const updatedUser = await Register.update(data, { where: { id: id } });
        if (updatedUser) {
            console.log("User updated successfully");
            req.headers.authorization = `Bearer ${token}`;
            return res.redirect("/registerview");
        } else {
            console.log("Error updated user");
            req.flash("error", "Error updating user");
            return res.redirect("back");
        }
    } else {
        const data = {
            fname: fname,
            lname: lname,
            email: email,
            field: role,
            token: token,
        };
        const updatedUser = await Register.update(data, { where: { id: id } });
        if (updatedUser) {
            console.log("User updated successfully");
            req.headers.authorization = `Bearer ${token}`;
            return res.redirect("/registerview");
        } else {
            console.log("Error updated user");
            req.flash("error", "Error updating user");
            return res.redirect("back");
        }
    }
};
const registerdelete = async (req, res) => {
    try {
        let id = req.params.did;
        let loggedInUser = req.user; // assuming you're using Passport.js for authentication
        // Check if the user being deleted matches the logged in user
        if (id === loggedInUser.id.toString()) {
            req.flash("error", "You cannot delete your own account");
            console.log("User attempted to delete their own account");
            return res.redirect("/registerview");
        }
        let deletedata = await Register.destroy({ where: { id: id } });
        if (deletedata) {
            // Delete all data from RunAppModel with the same App_Name as the deleted app
            // await AppRunModel.deleteMany({ App_Name: deletedata.name });

            req.flash("success", "Record Successfully Deleted");
            console.log("Record successfully deleted");
            return res.redirect("/registerview");
        } else {
            req.flash("error", "Record Not Deleted ");
            console.log("Record not successfully deleted");
            return res.redirect("/registerview");
        }
    } catch (err) {
        console.log(err);
        req.flash("error", "Error deleting record");
        return res.redirect("/registerview");
    }
};
module.exports = {
    index,
    UserLoginData,
    registerview,
    registereditpage,
    registeredit,
    registerdelete,
};
