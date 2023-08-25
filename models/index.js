const dbConfig = require("../config/dbConfig.js");

const { Sequelize, DataTypes } = require("sequelize");

const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
    host: dbConfig.HOST,
    dialect: dbConfig.dialect,
    operatorsAliases: false,
    logging: false,
});

sequelize.authenticate()
    .then(() => {
        console.log("connected..");
    })
    .catch((err) => {
        console.log("Error" + err);
    });

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.registers = require("./RegisterModel.js")(sequelize, DataTypes);
db.appregisters = require("./AppRegisterModel.js")(sequelize, DataTypes);
db.apprunmodel = require("./AppRunModel.js")(sequelize, DataTypes);
db.MT4Model = require("./MT4Model.js")(sequelize, DataTypes);
db.ProfileFile = require("./MT4ProfileFileModel.js")(sequelize, DataTypes);
db.GlobalvarFile = require("./MT4GlobalVarFileModel.js")(sequelize, DataTypes);
db.MT4App = require("./MT4TerminalAppsModel.js")(sequelize, DataTypes);
db.MT4ErrorLogList = require("./MT4ErrorLogListModel.js")(sequelize, DataTypes);
db.ProfileFolderDownloadReq = require("./ProfileDownloadreqModel.js")(sequelize, DataTypes);
db.GlobalFileDownloadreq = require("./GlobalFileDownloadreqModel.js")(sequelize, DataTypes);
db.ProfileFolderRestore = require("./ProfileRestoreModel.js")(sequelize, DataTypes);
db.GlobalFileRestore = require("./GlobalFileRestoreModel.js")(sequelize, DataTypes);
const MT4App = db.MT4App;
db.sequelize.sync({ force: false, alter: false })
    .then(() => {
        console.log("yes re-sync done!");
    })
    .catch((error) => {
        console.error("Error while syncing the database:", error);
    });

db.registers.hasMany(db.MT4Model, {
    foreignKey: 'user_id',
    as: 'MT4'
})
db.MT4Model.belongsTo(db.registers, {
    foreignKey: 'user_id',
    as: 'registers',
})
module.exports = db;

//mt4 tick time chack 
const cron = require("node-cron");
var ip = require('ip');
const myip = ip.address();
const date = new Date();
const twentySecondsAgo = new Date(date.getTime() - 20000); // Subtract 20,000 milliseconds (20 seconds)
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
const { sendEmail } = require("../config/mailtemplate");
const { spawn } = require("child_process");
let lastData = null;
const os = require("os");
const pchostname = os.hostname();
const fetchData = async (pchostname) => {
    const tableExistsQuery = `SELECT 1 FROM information_schema.tables WHERE table_name = 'meta_trader'`;
    const [tableExistsResult] = await sequelize.query(tableExistsQuery);
    const tableExists = tableExistsResult.length > 0;

    if (!tableExists) {
        console.log("Table 'meta_trader' does not exist. Aborting fetchData.");
        return;
    }

    const query = `SELECT * FROM meta_trader WHERE System_Name = '${pchostname}'`;
    const [result, metadata] = await sequelize.query(query);
    console.log(result);
    if (!lastData) {
        lastData = result;
    } else {
        const lastDataIds = lastData.map(data => data.ID);
        const newDataIds = result.map(data => data.ID);
        const matchedIds = lastDataIds.filter(id => newDataIds.includes(id));

        for (const data of result) {
            if (matchedIds.includes(data.ID)) {
                const lastDataMatch = lastData.find(d => d.ID === data.ID);
                const formattedTime = new Date(lastDataMatch.DateTime).toLocaleString("en-IN", updateAndLogCurrentDate());
                const Time = new Date(data.DateTime).toLocaleString("en-IN", updateAndLogCurrentDate());

                if (formattedTime === Time) {
                    const { ID, System_Name, Path } = data;
                    const childProcess = spawn(Path);
                    childProcess.on('error', (error) => {
                        console.error(`Error executing the .exe file: ${error}`);
                        return;
                    });
                    childProcess.stdout.on('data', (data) => {
                        console.log(`Standard output: ${data}`);
                    });
                    childProcess.stderr.on('data', (data) => {
                        console.error(`Standard error: ${data}`);
                    });
                    console.log("----------------------------------------------------------------");
                    console.log(`Executed path for ID ${ID}: ${Path}`);
                    newDataInserted = true;
                    const newApp = await MT4App.findOne({ where: { path: Path } });
                    // Send email
                    const emailData = [
                        {
                            subject: `Anomaly Detected in MT4 Installation on Machine ${System_Name}`,
                            text: `Hello Team,<br>
                                <br>
                                An anomaly was detected in an MT4 Installation on ${updateAndLogCurrentDate()} on Machine ${System_Name}. Installation path:<br>
                                <br>
                                - MT4 Installation Path: ${Path}
                                <br>
                                Thank you!`
                        },
                        {
                            subject: `Re-installation of MT4 Installation on Machine ${System_Name}`,
                            text: `Hello Team,<br>
                                <br>
                                An MT4 Installation was re-instated on ${updateAndLogCurrentDate()} on Machine ${System_Name}. Installation path:<br>
                                <br>
                                - MT4 Installation Path: ${Path}
                                <br>
                                Thank you!`
                        }
                    ];

                    for (const email of emailData) {
                        const isEmailSent = await sendEmail(email.subject, email.text);

                        if (isEmailSent) {
                            console.log("Email sent successfully.");
                        } else {
                            console.log("Email sending failed.");
                        }
                    }

                    if (newApp) {
                        // Update existing log timestamp
                        await MT4App.update(
                            { path: Path, system_name: System_Name, time: updateAndLogCurrentDate() },
                            { where: { path: Path } }
                        );
                        console.log("Data updated successfully110: ");
                    } else {
                        // Insert new log
                        await MT4App.create({
                            system_name: pchostname,
                            path: Path,
                            time: updateAndLogCurrentDate()
                        });
                        console.log("Data inserted successfully220: ");
                    }
                }
            }
        }
        lastData = result;
    }
};

cron.schedule("*/20 * * * * *", () => {
    fetchData(pchostname);
});
