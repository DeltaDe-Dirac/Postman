
class CampaignPerformanceReportValidator {
    constructor(parsedBodyExpected,
        parsedBodyActual,
        validationDataSize,
        expTotalRowNum,
        columnNamesForUniqueKey,
        columnNamesForValidation,
        runningMode,
        isDebugOn) {

        this.parsedBodyExpected = parsedBodyExpected;
        this.parsedBodyActual = parsedBodyActual;
        this.validationDataSize = validationDataSize;
        this.expTotalRowNum = expTotalRowNum;
        this.fieldsIndexesForValidation = fieldsIndexesForValidation;
        this.columnNamesForUniqueKey = columnNamesForUniqueKey;
        this.runningMode = runningMode;
        this.isDebugOn = (isDebugOn === 'true');

        this.parsedBodyActualDataMap = new Map();
    }

    get parsedBodyExpectedDataLength() {
        return this.parsedBodyExpectedData.length;
    }

    get parsedBodyActualDataLength() {
        return this.parsedBodyActualData.length;
    }

    get parsedBodyExpectedMetaFieldsLength() {
        return this.csvHeaderFields.length;
    }

    get parsedBodyActualMetaFieldsLength() {
        return this.parsedBodyActual.meta.fields.length;
    }

    isUndefinedOrZeroLength(arr, msg = '') {
        let isUndefinedOrZeroLength = !arr || arr.length == 0;

        if (isUndefinedOrZeroLength) {
            console.warn(this.runningMode, "Undefined or empty entity detected ", msg);
        }

        return isUndefinedOrZeroLength;
    }

    isUndefinedOrEmptyStr(str, msg = '') {
        let isUndefinedOrEmptyStr = !str || str === '';

        if (isUndefinedOrEmptyStr) {
            console.warn(this.runningMode, "Undefined or empty string detected ", msg);
        }

        return isUndefinedOrEmptyStr;
    }

    isValid(row, msg = '') {
        for (let columnName of this.columnNamesForKeyGeneration) {
            if (!row[columnName] || row[columnName] === '') {
                console.warn(this.runningMode, `Ignoring invalid row with [null/empty] value in [${msg}] for columnName [${columnName}]`);
                return false;
            }
        }

        return true;
    }

    isProdRunningMode() {
        return "PROD" === this.runningMode;
    }

    isDevRunningMode() {
        return "DEV" === this.runningMode;
    }

    isLocRunningMode() {
        return "LOCAL" === this.runningMode;
    }

    generateRowKey(row) {
        return this.columnNamesForUniqueKey.map((columnName) => row[columnName]).join('_');
    }

    convertPlainDataToMap() {
        this.parsedBodyActualData.forEach((actualDataRow) => {
            const key = this.generateRowKey(actualDataRow);
            this.parsedBodyActualDataMap.set(key, actualDataRow);
        });
    }

    init() {
        console.log(this.runningMode, "runningMode (init)");

        this.csvHeaderFields = this.isUndefinedOrZeroLength(this.parsedBodyExpected.meta, "parsedBodyExpected.meta") ||
            this.isUndefinedOrZeroLength(this.parsedBodyExpected.meta.fields, "parsedBodyExpected.meta.fields") ? [] : this.parsedBodyExpected.meta.fields;

        this.columnNamesForKeyGeneration = this.isUndefinedOrZeroLength(this.fieldIndexesForUniqueKey, "fieldIndexesForUniqueKey") ?
            this.csvHeaderFields : this.mapColumnIdsToColumnNames(this.fieldIndexesForUniqueKey);
        this.csvHeaderFields = this.isUndefinedOrZeroLength(this.parsedBodyExpected.meta, "parsedBodyExpected.meta -> fallback to []") ||

        this.columnNamesForUniqueKey = this.isUndefinedOrZeroLength(this.columnNamesForUniqueKey, "columnNamesForUniqueKey -> fallback to csvHeaderFields") ?
            this.csvHeaderFields : this.columnNamesForUniqueKey;

        this.columnNamesForValidation = this.isUndefinedOrZeroLength(this.columnNamesForValidation, "columnNamesForValidation -> fallback to csvHeaderFields") ?
            this.csvHeaderFields : this.columnNamesForValidation;


        this.parsedBodyExpectedData = this.isUndefinedOrZeroLength(this.parsedBodyExpected.data, "parsedBodyExpectedData") ?
            this.parsedBodyExpected.data : this.parsedBodyExpected.data.filter((row) => this.isValid(row, "parsedBodyExpectedData"));

        this.validationDataSize = this.isUndefinedOrEmptyStr(this.validationDataSize, "validationDataSize") ? 0 : parseInt(this.validationDataSize);

        this.parsedBodyActualData = this.isUndefinedOrZeroLength(this.parsedBodyActual.data, "parsedBodyActualData") ?
            this.parsedBodyActual.data : this.parsedBodyActual.data.filter((row) => this.isValid(row, "parsedBodyActualData"));

        this.expTotalRowNum = this.isUndefinedOrEmptyStr(this.expTotalRowNum, "expTotalRowNum") ? 0 : parseInt(this.expTotalRowNum);

        this.runningMode = this.isUndefinedOrEmptyStr(this.runningMode, "runningMode") ?
            "PROD" : this.runningMode;

        if (this.isProdRunningMode() || this.isLocRunningMode()) {
            this.convertPlainDataToMap();
        } else if (this.isDevRunningMode()) {
            [this.parsedBodyExpectedData, this.parsedBodyActualData] = [this.parsedBodyActualData, this.parsedBodyExpectedData];
            [this.validationDataSize, this.expTotalRowNum] = [this.expTotalRowNum, this.validationDataSize];

            console.warn(this.runningMode, "Switched actual with expected for DEV mode");
            this.convertPlainDataToMap();
        }

        if (this.isDebugOn) {
            console.log(this.runningMode, "parsedBodyExpectedData", this.parsedBodyExpectedData);
            console.log(this.runningMode, "validationDataSize", this.validationDataSize);

            console.log(this.runningMode, "expTotalRowNum", this.expTotalRowNum);

            console.log(this.runningMode, "csvHeaderFields", this.csvHeaderFields);
            console.log(this.runningMode, "columnNamesForUniqueKey", this.columnNamesForUniqueKey);
            console.log(this.runningMode, "columnNamesForValidation", this.columnNamesForValidation);

            /* actual data print out only in DEV mode due to heavy data in PROD*/
            if (this.isDevRunningMode()) {
                console.log(this.runningMode, "parsedBodyActualData", this.parsedBodyActualData);
                console.log(this.runningMode, "parsedBodyActualDataMap", this.parsedBodyActualDataMap);
            }
        }
    }

    validateColumnNamesMatch() {
        this.csvHeaderFields.forEach((columnName, index) => {
            pm.expect(columnName).to.eql(this.parsedBodyActual.meta.fields[index]);
        });
    }

    isEqual(expected, actual) {
        for (let columnName of this.columnNamesForValidation) {
            if (!actual[columnName] || expected[columnName] != actual[columnName]) {
                return false;
            }
        }

        return true;
    }

    validateData() {
        let validEntries = 0;

        this.parsedBodyExpectedData.forEach((expectedRow) => {
            const key = this.generateRowKey(expectedRow);
            const isIdentical = this.parsedBodyActualDataMap.has(key) ? this.isEqual(expectedRow, this.parsedBodyActualDataMap.get(key)) : false;

            if (isIdentical) {
                ++validEntries;
            } else {
                console.warn(this.runningMode, "expected row", expectedRow, "is not equal to actual row", this.parsedBodyActualDataMap.get(key),
                    "or actual map doesn't hold the key", key, "valid entries", validEntries);
            }

            pm.expect(isIdentical).to.eql(true);
        });
    }
}