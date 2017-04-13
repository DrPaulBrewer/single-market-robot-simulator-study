/* Copyright 2017 Paul Brewer, Economic and Financial Technology Consulting LLC */
/* This file is open source software.  The MIT License applies to this software. */

/* jshint browserify:true,esnext:true,eqeqeq:true,undef:true,lastsemic:true,strict:true,unused:true */

const clone = require('clone');

function pad(x){
    "use strict";
    return (x<10)? ("0"+x) : (''+x);
}

function myDateStamp(thedate){
    "use strict";
    const now = thedate || new Date();
    return ( ''+ now.getUTCFullYear() +
	     pad(now.getUTCMonth() + 1) +
	     pad(now.getUTCDate()) +
	     'T' + pad(now.getUTCHours()) +
	     pad(now.getUTCMinutes()) +
	     pad(now.getUTCSeconds())
	   );
}

module.exports.myDateStamp = myDateStamp;

function letter(n){
    "use strict";
    var A = "A".charCodeAt(0);
    return String.fromCharCode(A+n);
}

module.exports.letter = letter;

/**
 * creates a function that clones input object, and then overrides some properties with those in a clone of obj.com
mon
 * @param {Object} obj object with a .common property, obj.common should also be an object
 * @return {function(c: Object):Object} clone of c with properties overridden by obj.common
 */

function commonFrom(obj){
    "use strict";
    return function(c){
	const result =  Object.assign({},clone(c),clone(obj.common));
	return result;
    };
}

module.exports.commonFrom = commonFrom;

/**
 *
 * creates a list of directory or file paths where individual simulation data may be found, given a study's config.json file
 *
 * @param {string} pathToStudyJSON path to the study "config.json" file
 * @param {number} numberOfConfigurations the number of configurations, e.g. study.configurations.length
 * @param {filename} filename to append to resulting path in each directory
 * @return {string[]} 
 */

function paths(pathToStudyJSON, numberOfConfigurations,filename){
    "use strict";
    const list = [];
    const filenameRegex = /[^\/]*$/;
    const f = filename || '';
    for(var j=0,l=numberOfConfigurations; j<l; ++j)
	list.push(pathToStudyJSON.replace(filenameRegex, letter(j)+"/"+f));
    return list;
}

module.exports.paths = paths;

/**
 * Create new simulations from ~ Jan-2017 original study cfg format 
 * @param {Object} cfg The study configuration
 * @param {Array<Object>} cfg.configurations An array of SMRS.Simulation() configurations, one for each independent simulation in a study.  
 * @param {Object} cfg.common Common simulation configuration settings to be forced in all simulations. (if there is a conflict, common has priority over and overrides configurations)
 * @param {Object} Simulation A reference to the (possibly forked) single-market-robot-simulator.Simulation constructor function
 * @return {Array<Object>} array of new SMRS.Simulation - each simulation will be initialized but not running
 */

function makeClassicSimulations(cfg, Simulation){
    "use strict";
    if (!cfg) return [];
    if (!(Array.isArray(cfg.configurations))) return [];
    return (cfg
	    .configurations
	    .map(commonFrom(cfg))
	    .map((s)=>(new Simulation(s)))
	   );
}

module.exports.makeClassicSimulations = makeClassicSimulations ;


