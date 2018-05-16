(function(CognitoUserPool) {
	var CognitoUserPool = window.AmazonCognitoIdentity.CognitoUserPool,
		AWSCognito = window.AWSCognito,
		CognitoIdentityServiceProvider = AWSCognito.CognitoIdentityServiceProvider,
		CognitoUserAttribute = CognitoIdentityServiceProvider.CognitoUserAttribute,
		CognitoUser = CognitoIdentityServiceProvider.CognitoUser,
		AuthenticationDetails = CognitoIdentityServiceProvider.AuthenticationDetails,
		UserPool = new CognitoUserPool({
			UserPoolId : window.USER_POOL_ID, // Your user pool id here
			ClientId : window.CLIENT_ID, // Your client id here
		}),
		User,
		sub = '';

	/* SignUp
		Connects to Cognito Server and attempts to create a new account
			params: Contains email and password by default in an array
	*/
	function signUp(params) {
		//Set email to all lower-case, as default Cognito behavior is case-sensitive
		email = params.email.toLowerCase();
		var attributes = [new CognitoUserAttribute({
			Name: 'email',
			Value: email,
		})]
		//Promise required as this is run asynchronously
		return new Promise(function(resolve, reject) {
			UserPool.signUp(
				email,
				params.password,
				attributes,
				null,
				function(err, result) {
					if (err) {
						reject(err);
						return;
					}
					User = result.user;
					resolve(User);
				return;
				}
			)
		});
	}
	
	/* Confirm
		Connects to Cognito server and  confirms an account that was created via Signup
			username: Email Address account is being setup with
			code: Confirmation code sent to the email in question
	*/
	function confirm(username, code) {
		//Promise required as this is run asynchronously
		username = username.toLowerCase();
		User = new CognitoUser({
			Username : username,
			Pool: UserPool,
		});
		//Promise required as this is run asynchronously
		return new Promise(function(resolve, reject) {
			User.confirmRegistration(code, true, function(err, result) {
				if (err) {
					reject(err);
					return;
				}
				resolve(result);
				return;
			});
		})
	}

  	/* ResendConfirmation
		Recreates and sends a Confirmation code for an account that was signed up, but hasn't logged in yet
	*/
	function resendConfirmationCode() {
		return new Promise(function(resolve, reject) {
			User.resendConfirmationCode(function(err, result) {
				if (err) {
					reject(err);
					return;
				}
				resolve(result);
			});
		});
	}
  
	/* Forgot Password
		Connects to Cognito server and generates a reset code that is sent via email, which must be entered to reset the account
			username: Email Address account is being setup with
	*/
	function forgotPassword(username) {
		//All emails in back-end are lower-case to avoid case-sensitivity issues
		username = username.toLowerCase();
		User = new CognitoUser({
			Username : username,
			Pool: UserPool,
		});
		return new Promise(function(resolve, reject) {
			User.forgotPassword({
				onSuccess: function (result) {
					console.log('call result: ' + result);
					resolve(result)
				},
				onFailure: function(err) {
					reject(err)
				},
			});
		})
	}
	
	function confirmPassword(username, confirm, pass) {
		username = username.toLowerCase();
		User = new CognitoUser({
			Username : username,
			Pool: UserPool,
		});
		return new Promise(function(resolve, reject) {
			User.confirmPassword(confirm, pass,{
				onSuccess: function (result) {
					console.log('call result: ' + result);
					resolve(result);
				},
				onFailure: function(err) {
					reject(err);
				},
			});
		});
	}

  	/* Login
		Provides Login functionality for created accounts. If proper credentials are entered, it will
		also determine if the account needs a password reset or not. Handling outside this is reserved to the app's mechanics.
			username: Email Address account is being setup with
			password: Password provided by user
	*/
	function logIn(username, password) {
		username = username.toLowerCase();
		var authenticationDetails = new AuthenticationDetails({
			Username: username,
			Password: password,
		});
		User = new CognitoUser({
			Username: username,
			Pool: UserPool,
		});
    
		return new Promise(function(resolve, reject) {
			User.authenticateUser(authenticationDetails, {
				onSuccess: resolve,
				onFailure: reject,
				newPasswordRequired: function(userAttributes, requiredAttributes) {
					var newPw = window.prompt("Please enter a new password: (must include 8 characters, Capital and lowercase letter, and a number");
					User.completeNewPasswordChallenge(newPw, requiredAttributes, this);
				}
			})
		})
  }
 
	/* GetSession, isAuthenticated, isNotAuthenticated
		Used to pull existing session if user has already logged in, or if the session has expired/doesn't exist.
	*/
	function getSession() {
		User || (User = UserPool.getCurrentUser());
		return new Promise(function(resolve, reject) {
			if (User === null) {
				reject('No current session found.');
				return;
			}
			User.getSession(function(err, session) {
				if (err) {
					reject(err);
					return;
				}
				else if (session.isValid() === false){
					reject('Session is invalid');
				}
				else {
					var a = session.getIdToken().getJwtToken();
					var b = atob(a.split(".")[1]);
					sub = JSON.parse(b).sub;
					//console.log(JSON.parse(b))
					var a = 'cognito-idp.us-west-2.amazonaws.com/'+ USER_POOL_ID;
					AWS.config.region = 'us-west-2';
					AWS.config.credentials = new AWS.CognitoIdentityCredentials({
						region: 'us-west-2',
						IdentityPoolId: 'us-west-2:1a49aa9f-09bc-4052-9e22-7c3cf3d78fe5',
						Logins: {
							[a] : session.getIdToken().getJwtToken()
						}
					});
					resolve();
					return;
				}
			})
		})
  }
	function isAuthenticated() {
    return getSession();
}
	function isNotAuthenticated() {
    return new Promise(function(resolve, reject) {
      getSession().then(reject).catch(resolve);
    })
  }

	/* GetUser
		Provides user attribute information for the logged-in user
	*/
	function getUser() {
    return (
      getSession()
      .then(function(err,session) {
		console.log(session)
        // NOTE: getSession must be called to authenticate user before 
        // calling getUserAttributes
        return new Promise(function(resolve, reject) {
          User.getUserAttributes(function(err, attributes) {
            if (err) {
              reject(err);
              return
            }
            // Reduce the attributes into a simpler object.
            resolve(attributes.reduce(function (acc, attr) {
              var attribute = {};
              attribute[attr.getName()] = attr.getValue();
              return Object.assign(acc, attribute);
            }, {}));
            return;
          });
        })
      })
    )
  }

	/* SignOut
		Connects to Cognito Server and times-out all sessions for the user in question
	*/
	function signOut() {
		User || (User = UserPool.getCurrentUser())
		if (!User) {
			return Promise.reject('Current user session not found');
		}
		return Promise.resolve(User.signOut());
  }

  	/* GetSub
		Provides Unique Cognito ID, which serves as an account's fingerprint
	*/
	function getSub() {
		return sub;
	}

	//Sets Cognito object in the window on page load - All functions must be referenced here to be called
	window.Cognito = Object.freeze({
		signUp: signUp,
		confirm: confirm,
		logIn: logIn,
		resendConfirmationCode: resendConfirmationCode,
		getSession: getSession,
		getUser: getUser,
		getSub: getSub,
		signOut: signOut,
		isAuthenticated: isAuthenticated,
		isNotAuthenticated: isNotAuthenticated,
		forgotPassword: forgotPassword,
		confirmPassword: confirmPassword,
	})
})(window)
