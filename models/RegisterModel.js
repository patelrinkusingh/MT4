const bcrypt = require('bcrypt');

module.exports = (sequelize, DataTypes) => {
    const register = sequelize.define("UserRegisters", {
        fname: {
            type: DataTypes.STRING,
        },
        lname: {
            type: DataTypes.STRING,
        },
        email: {
            type: DataTypes.STRING,
        },
        password: {
            type: DataTypes.STRING,
        },
        cpassword: {
            type: DataTypes.STRING,
        },
        field: {
            type: DataTypes.STRING,
        },
    });
    
    return register;
};

  // register.beforeCreate(async (user) => {
    //     const hashedPassword = await bcrypt.hash(user.password, 10);
    //     const hashedCPassword = await bcrypt.hash(user.Cpassword, 10);
    //     user.password = hashedPassword;
    //     user.Cpassword = hashedCPassword;
    // });