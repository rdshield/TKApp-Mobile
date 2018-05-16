(function(win) {

	//Note: This cannot be created at the beginning. Cognito credentials must be secured and stored before this is called. It WILL fail.
	var docClient;	//Variable used for connections to DynamoDB	

	/*Connect
		Sets AWS (Cognito/DynamoDB) credentials for database connectivity.
	*/
	function connect(){
		AWS.config.region = 'us-west-2';
		AWS.config.credentials.get(function(err) {
			if (err) {
				console.error(err);
			}
		});
	}

	/* getParameters(Read/Write/Delete)
		Provides Formatted parameters for calls to DynamoDB
			tableId: the name of the table you want to access
			info: Array representing the information you are looking for/adding/etc.
	*/
	function getParameters(tableId, info) {
		params = { TableName : tableId };
		params.Item = info;
		return params;
	}

	/* getParameters(Delete)
		Provides Formatted parameters for calls to DynamoDB (specifically for deletion)
			tableId: the name of the table you want to access
			info: Array representing the information you are looking to delete.
	*/
	function getDeleteParameters(tableId, info) {
		params = { TableName : tableId };
		params.Key = info;
		return params;
	}

	/* ReadItem
		Request a Single Item from a table
			Params: Parameters used to denote the entry needed (processed by getParameters function)
	*/
	function readItem(params) {
		//console.log(params);
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

	/* ReadItems
		Request a set of Item from a table
			Params: Parameters used to denote the entry needed (processed by getParameters function)
	*/
	function readItems(tableId,filter='',exp={}){
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

	/* WriteItem
		Write/Update a single item to the table noted in parameters
			Params: Parameters used to denote the entry needed (processed by getParameters function)
	*/
	function writeItem(wParams) {
		//console.log(wParams);
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

	/* DeleteItem
		Write/Update a single item to the table noted in parameters
			Params: Parameters used to denote the entry needed (processed by getParameters function)
	*/
	function deleteItem(wParams) {
		docClient = new AWS.DynamoDB.DocumentClient();
		docClient.delete(wParams, function(err,data) {
			if(!err) {
				console.log("Success - Delete Completed");
			}
			else { 
				console.log("Unable to Delete -" + err);
			}
		});
	}

	//Used to update single attributes on an item
	function updateItem(wParams) {
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

	//Sets Database Client object in the window on page load - All functions must be referenced here to be called
    window.DBClient = Object.freeze({
		connect: connect,
		readItem: readItem,
		writeItem: writeItem,
		getParameters: getParameters,
		readItems: readItems,
		deleteItem: deleteItem,
		getDeleteParameters: getDeleteParameters,
		updateItem: updateItem,
	  })
	})(window)