module.exports = (sequelize, DataTypes) => {
    const GlobalFileDownloadreq = sequelize.define("GlobalFileDownloadreq", {
        system_name: {
            type: DataTypes.STRING,
        },
        globalvar_file_path: {
            type: DataTypes.STRING,
        },
        globalvar_backup_path:{
            type: DataTypes.STRING,
        },
        status: { type: DataTypes.BOOLEAN, defaultValue: false },
    });
    
    return GlobalFileDownloadreq;
};
