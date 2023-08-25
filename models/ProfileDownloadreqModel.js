module.exports = (sequelize, DataTypes) => {
    const ProfileFolderDownloadReq = sequelize.define("ProfileFolderDownloadReq", {
        system_name: {
            type: DataTypes.STRING,
        },
        profile_folder_path: {
            type: DataTypes.STRING,
        },
        profile_backup_path: {
            type: DataTypes.STRING,
        },
        status: { type: DataTypes.BOOLEAN, defaultValue: false },
    });
    return ProfileFolderDownloadReq;
};
