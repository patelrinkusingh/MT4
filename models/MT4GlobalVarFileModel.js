module.exports = (sequelize, DataTypes) => {
    const GlobalVarFile = sequelize.define("GlobalVarFileBackUpList", {
        file: {
            type: DataTypes.TEXT('long'),
        },
        system_name: {
            type: DataTypes.STRING,
        },
        globalvar_file_path: {
            type: DataTypes.STRING,
        },
        globalvar_backup_path: {
            type: DataTypes.STRING,
        },
        time: {
            type: DataTypes.STRING,
        }
    });
    return GlobalVarFile;
};
