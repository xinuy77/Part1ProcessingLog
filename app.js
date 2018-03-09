var csv        = require('csv'); 
var csv_export = require('csv-export');
var fs         = require('fs');

const SCHEME_TYPE = {IMAGEPT: {VAL: 0, PATH: './PUT_CSV_HERE/Imagept21.csv', STR: 'Imagept21', SUCCESS: 'goodLogin', FAILURE: 'badLogin'}, 
	             TEXT: {VAL: 1, PATH: './PUT_CSV_HERE/Text21.csv', STR: 'Text21', SUCCESS: 'success', FAILURE: 'failure'}};

function CSV_Data(timeTaken, userId, scheme, numFail, numSuccess, timeTakenSuccess, timeTakenFail) {
    this.TimeTaken         = timeTaken;
    this.TimeTakenFail     = timeTakenFail;
    this.TimeTakenSuccess  = timeTakenSuccess;
    this.UserId            = userId;
    this.PasswordScheme    = scheme;
    this.FailedLoginCount  = numFail;
    this.SuccessLoginCount = numSuccess;
};

function Time(timeStamp) {
    this.Hour = timeStamp.slice(11, 13);
    this.Min  = timeStamp.slice(14, 16);
    this.Sec  = timeStamp.slice(17, 19);
};

function calcTimeDiff(StartTime, EndTime) {
    var sTimeInSec = (parseInt(StartTime.Hour)*3600) + (parseInt(StartTime.Min) * 60) + parseInt(StartTime.Sec);
    var eTimeInSec = (parseInt(EndTime.Hour)*3600) + (parseInt(EndTime.Min) * 60) + parseInt(EndTime.Sec);

    return eTimeInSec - sTimeInSec;
};

function cleanData(data) {
    var cleanedData = [];
    
    for(var i = 0; i < data.length; i++) {
      var index = cleanedData.findIndex(x => (x.UserId === data[i].UserId && x.PasswordScheme === data[i].PasswordScheme));
      if (index != -1){
          cleanedData[index].FailedLoginCount  += data[i].FailedLoginCount;
          cleanedData[index].SuccessLoginCount += data[i].SuccessLoginCount;
	  cleanedData[index].TimeTaken          = cleanedData[index].TimeTaken.concat(data[i].TimeTaken);
	  cleanedData[index].TimeTakenSuccess   = cleanedData[index].TimeTakenSuccess.concat(data[i].TimeTakenSuccess);
	  cleanedData[index].TimeTakenFail      = cleanedData[index].TimeTakenFail.concat(data[i].TimeTakenFail);
      }
      else {
          cleanedData.push(data[i]);
      }
    }

    for(var i = 0; i < cleanedData.length; i++) {
        cleanedData[i].TotalAvgTimeTakenInSec = calcAvgTime(cleanedData[i].TimeTaken);
        cleanedData[i].AvgTimeFailInSec       = calcAvgTime(cleanedData[i].TimeTakenFail);
        cleanedData[i].AvgTimeSuccessInSec    = calcAvgTime(cleanedData[i].TimeTakenSuccess);
	delete cleanedData[i].TimeTaken;
	delete cleanedData[i].TimeTakenSuccess;
	delete cleanedData[i].TimeTakenFail;
    }
    
    return cleanedData;
};

function calcAvgTime(arr) {
    var total = 0;
    var mean  = 0;

    for (var i = 0; i < arr.length; i++) {
        total += arr[i];
    }

    mean = (total/arr.length).toFixed(2);
 
    if(isNaN(mean)) {
        mean = 0;
    }
	
    return mean;
};

function processCSV(SCHEME_TYPE, CALLBACK) {
    var processed_Data = []; 

    csv().from.path(SCHEME_TYPE.PATH).to.array(function (data) {
        var startTime, endTime, userId = "", subscheme = "", 
            failCounter    = 0,
            successCounter = 0,
	    timeTaken      = [],
            timeTakenFail  = [],
            timeTakenSuccess = []; //in sec
      
        for (var index = 0; index < data.length; index++) {
	    var status    = data[index][7];
	    var timeStamp = data[index][1];
	    var uId       = data[index][2];
            var sscheme   = data[index][5];
    
	    if(userId != uId || index == data.length - 1 || subscheme != sscheme) {
	        if((index != 0 || index == data.length - 1) && subscheme != 'N/A') {
                    processed_Data.push(new CSV_Data(timeTaken, userId, SCHEME_TYPE.STR + ': ' + subscheme, failCounter, successCounter, timeTakenSuccess, timeTakenFail));
		    failCounter      = 0;
		    successCounter   = 0;
		    timeTaken        = [];
		    timeTakenFail    = [];
		    timeTakenSuccess = [];
                }
	        userId    = uId;
	        subscheme = sscheme;
	    }
    
            if(status == "start") {
                startTime = new Time(timeStamp);
            }
	    else if(status == SCHEME_TYPE.SUCCESS && index != 0 && sscheme != 'N/A') {
		//console.log(timeStamp);
	        endTime = new Time(timeStamp);
		if (calcTimeDiff(startTime, endTime) > 0) {
	            timeTaken.push(calcTimeDiff(startTime, endTime));
	            timeTakenSuccess.push(calcTimeDiff(startTime, endTime));
                    successCounter++;
		}
            }
	    else if(status == SCHEME_TYPE.FAILURE && index != 0 && sscheme != 'N/A') {
		//console.log(timeStamp);
	        endTime = new Time(timeStamp);
		if (calcTimeDiff(startTime, endTime) > 0) {
	            timeTaken.push(calcTimeDiff(startTime, endTime));
	            timeTakenFail.push(calcTimeDiff(startTime, endTime));
	            failCounter++;
		}
	    }
        }
        processed_Data = cleanData(processed_Data);
	
	CALLBACK(processed_Data);
    });
}

function main() {
    var data;

    processCSV(SCHEME_TYPE.IMAGEPT, function(imagept_data) {
        processCSV(SCHEME_TYPE.TEXT, function(text_data) {
	    data = imagept_data.concat(text_data);
            csv_export.export(data, function(buffer) {
               fs.writeFileSync('./Processed_Data.zip', buffer);
            });
        });
    });	
}

main();
