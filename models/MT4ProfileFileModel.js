module.exports = (sequelize, DataTypes) => {
    const ProfileFile = sequelize.define("ProfileFileBackUpList", {
        file: {
            type: DataTypes.TEXT('long'),
        },
        system_name: {
            type: DataTypes.STRING,
        },
        profile_folder_path: {
            type: DataTypes.STRING,
        },
        profile_backup_path: {
            type: DataTypes.STRING,
        },
        time: {
            type: DataTypes.STRING,
        }
    });
    return ProfileFile;
};
