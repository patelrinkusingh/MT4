module.exports = (sequelize, DataTypes) => {
    const MT4Model = sequelize.define("MT4IntenseList", {
        system_name: {
            type: DataTypes.STRING,
        },
        profile_path: {
            type: DataTypes.STRING,
            unique: true, // Set this field as unique
        },
        profile_backup_path: {
            type: DataTypes.STRING,
            unique: true, // Set this field as unique
        },
        globalvar_path: {
            type: DataTypes.STRING,
            unique: true, // Set this field as unique
        },
        globalvar_backup_path: {
            type: DataTypes.STRING,
            unique: true, // Set this field as unique
        },
        status: { type: DataTypes.BOOLEAN, defaultValue: false },
    });
    return MT4Model;
};
