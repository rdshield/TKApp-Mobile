angular.module('app.services', ['ngStorage'])

.factory ('StorageService', function ($localStorage) {

$localStorage = $localStorage.$default({
	child: {},
	children: {},
	challenges: [],
	currentChallenges: 	 [],
	completedChallenges: [],
	canceledChallenges:	 [],
	
});
	
var	_getAll = function () 	   {  return $localStorage; }
var _add 	= function (key,thing) { $localStorage[key] = thing }
var _remove = function (thing) { $localStorage.things.splice($localStorage.things.indexOf(thing), 1) }
var _reset = function () {
	$localStorage.child= 				{},
	$localStorage.children= 			{},
	$localStorage.challenges= 			[],
	$localStorage.currentChallenges= 	[],
	$localStorage.completedChallenges= 	[],
	$localStorage.canceledChallenges=	[];
}

return {
    getAll: _getAll,
    add: _add,
    remove: _remove,
	resetToDefault: _reset,
  };
})