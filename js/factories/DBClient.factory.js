angular.module('DBClient', [])
.factory('DBClientFactory', function() {
	var DBClient = {};
	
	DBClient.getParameters = function(tableId, info) {
		params = { TableName : tableId };
		params.Item = info;
		return params;
	}
	
	DBClient.getDeleteParameters = function(tableId, info) {
		params = { TableName : tableId };
		params.Key = info;
		return params;
	}

	DBClient.readItem = function(params) {
		docClient = new AWS.DynamoDB.DocumentClient();
		return new Promise(function(resolve, reject) {
			 docClient.get(params, function(err,data) {
				if(!err) {
					//console.log("Success",data.Item);
					resolve(data.Item);
				}
				else { 
					//console.log("Unable to find item -" + err);
					reject(err);
				}
			});
		});
	}

	
	DBClient.readItems = function(tableId,filter='',exp={}){
		var params = {
			TableName: tableId,
		};
		if((filter!='')) { 
			params.FilterExpression = filter; 
			params.ExpressionAttributeValues = exp; 
		}

		docClient = new AWS.DynamoDB.DocumentClient();
		
		return new Promise(function(resolve, reject) {
			 docClient.scan(params, function(err,data) {
				if(!err) {
					//console.log("Success",data);
					resolve(data);
				}
				else { 
					//console.log("Unable to find item -" + err);
					reject(err);
				}
			});
		});
	}
	
	DBClient.writeItem = function(wParams) {
		docClient = new AWS.DynamoDB.DocumentClient();
		docClient.put(wParams, function(err,data) {
			if(!err) {
				console.log("Success - Write Completed");
			}
			else { 
				console.log("Unable to Write -" + err);
			}
		});
	}
	
	DBClient.updateItem = function(wParams) {
		docClient = new AWS.DynamoDB.DocumentClient();
		docClient.update(wParams, function(err,data) {
			if(!err) {
				console.log("Success - Update Completed");
			}
			else { 
				console.log("Unable to Update -" + err);
			}
		});
		}


	return DBClient;
})