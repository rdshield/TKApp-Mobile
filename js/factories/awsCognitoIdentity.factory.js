angular.module('aws.cognito.identity', [])
.factory('awsCognitoIdentityFactory', function() {
  var aws = {};
  var cognitoUser = null; //CognitoUser object

  /* CUSTOM AWS COGNITO CONFIGURATION */
  var cognitoEndpoint = 'cognito-idp.us-west-2.amazonaws.com';
  var region = 'us-west-2';
  // how to get userPoolId, go to AWS Console -> Cognito -> User pools -> <select_user_pool> -> Pool details -> Pool Id
  var userPoolId = 'us-west-2_7Qa6mard7';
  // how to get clientId, go to AWS Console -> Cognito -> User pools -> <select_user_pool> -> Apps -> App client id
  var clientId = '7rnqr5p0krrgjalf4igaarjjh0';
  // how to get identityPoolId, go to AWS Console -> Cognito -> Federate Identities > <select_federate_identity> -> Edit -> Identity pool ID
  var identityPoolId = 'us-west-2:cd6145a2-2e7d-4f1b-aa51-f53e77605ce8';
 

  AWS.config.region = region;
  AWS.config.credentials = new AWS.CognitoIdentityCredentials({ IdentityPoolId: identityPoolId });

  AWSCognito.config.region = region;
  AWSCognito.config.credentials = new AWS.CognitoIdentityCredentials({ IdentityPoolId: identityPoolId });
  AWSCognito.config.update({ accessKeyId: 'anything', secretAccessKey: 'anything' })

  var poolData = { UserPoolId: userPoolId, ClientId: clientId };
  var userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(poolData);

  /* Public methods */

  // Register a new user in Aws Cognito User pool
  aws.signUp = function(user, params, callback) {
    setupUser(user);

    var attributeList = [
			new AWSCognito.CognitoIdentityServiceProvider.CognitoUserAttribute({ Name: 'email', Value: user }),
			new AWSCognito.CognitoIdentityServiceProvider.CognitoUserAttribute({ Name: 'name', Value: params.name }),
			new AWSCognito.CognitoIdentityServiceProvider.CognitoUserAttribute({ Name: 'family_name', Value: params.family_name }),
			new AWSCognito.CognitoIdentityServiceProvider.CognitoUserAttribute({ Name: 'custom:address', Value: params.address }),
			new AWSCognito.CognitoIdentityServiceProvider.CognitoUserAttribute({ Name: 'custom:city', Value: params.city }),
			new AWSCognito.CognitoIdentityServiceProvider.CognitoUserAttribute({ Name: 'custom:state', Value: params.state }),
			new AWSCognito.CognitoIdentityServiceProvider.CognitoUserAttribute({ Name: 'custom:zipCode', Value: params.zipCode }),
			new AWSCognito.CognitoIdentityServiceProvider.CognitoUserAttribute({ Name: 'custom:phone_number', Value: params.phoneNum}),
	] 
    return userPool.signUp(user, params.pass1, attributeList, null, callback);
  }

  // Login user and setup a credential object
  aws.signIn = function(username, password, callback) {
    setupUser(username);

    var authenticationData = { Username: username, Password: password };
    var authenticationDetails =
      new AWSCognito.CognitoIdentityServiceProvider.AuthenticationDetails(authenticationData);

    cognitoUser.authenticateUser(authenticationDetails, {
      onSuccess: function (result) {
        //console.log('access token + ' + result.getAccessToken().getJwtToken());
        initConfigCredentials(result.idToken.jwtToken);
        return AWS.config.credentials.get(callback);
      },
      onFailure: function(err) {
        return callback(err);
      },
    });
  }

  // Logout user and clear a cache id 
  aws.signOut = function() {
    if(cognitoUser != null) cognitoUser.signOut();
    cognitoUser = null;
    AWS.config.credentials.clearCachedId();
    return true;
  }

  // This method is useful when user must have access to the app in offline mode.
  aws.getUserFromLocalStorage = function(callback) {
    cognitoUser = userPool.getCurrentUser();
    if (cognitoUser != null) {
      cognitoUser.getSession(function(err, session) {
        if (err) {
	      console.log(err);
          callback(err);
          return false;
        }
        //console.log('session validity: ' + session.isValid());
        initConfigCredentials(session.idToken.jwtToken);
        return callback(null, session.isValid());
      });
    } else { 
		console.log("No Login Found")
		return callback(null, false);
	}
  }

  aws.getUserName = function() {
    if(cognitoUser) return cognitoUser.username
    else return false
  }
  
  aws.getSub = function() {
    if(cognitoUser) return AWS.config.sub
    else return false
  }

  aws.confirmAccount = function(username, code, callback) {
    setupUser(username)
    return cognitoUser.confirmRegistration(code, true, callback);
  }

  aws.resendCode = function(username, callback) {
    setupUser(username)
    return cognitoUser.resendConfirmationCode(callback);
  }

  /* Private methods */
  setupUser = function(username) {
    var userData = { Username : username, Pool : userPool };
    cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);
  }

  initConfigCredentials = function(jwtToken) {
    var logins = {};
    logins[cognitoEndpoint + "/" + userPoolId] = jwtToken;
	
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
      IdentityPoolId: identityPoolId,
      Logins: logins
    });
	var b = atob(jwtToken.split(".")[1]);
	AWS.config.sub  = JSON.parse(b).sub;
  }
  return aws;
});
