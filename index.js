/* Copyright 2017- Paul Brewer, Economic and Financial Technology Consulting LLC */
/* This file is open source software.  The MIT License applies to this software. */

/* jshint browserify:true,esnext:true,eqeqeq:true,undef:true,lastsemic:true,strict:true,unused:true */

const clone = require('clone');

function pad(z){
    "use strict";
    const x = Math.floor(+z);
    if ((x===undefined) || (Number.isNaN(x)))
	throw new Error("pad: expected numeric input");
    return (x<10)? ("0"+x) : (''+x);
}

module.exports.pad = pad;

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
	list.push(pathToStudyJSON.replace(filenameRegex, pad(j)+"/"+f));
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
	    .map((s,j)=>{ if (s.caseid===undefined) s.caseid=j; return s; })
	    .map((s)=>(new Simulation(s)))
	   );
}

module.exports.makeClassicSimulations = makeClassicSimulations ;

function metaSummary(cfg){
    "use strict";
    const meta = {};
    if (cfg && cfg.common){
	if (cfg.title) meta.title = cfg.title;
	if (cfg.name) meta.name = cfg.name;
	['periods','numberOfBuyers','numberOfSellers'].forEach((p)=>{
	    if (cfg.common[p])
		meta[p] = ''+cfg.common[p];
	});
	if (Array.isArray(cfg.configurations))
	    meta.numberOfConfigurations = cfg.configurations.length;
    }
    return meta;
}

module.exports.metaSummary = metaSummary;

/**
 * clones study _config and modifies it for expansion.
 * If the number of buyers or sellers is 1, that number is unchanged.  Otherwise, multiplies the number of buyers and sellers by xfactor.
 * .buyerValues and .sellerCosts arrays in the current study are updated using supplied function how.  " x"+factor is appended to study name. 
 */

function expand(_config, xfactor, how){
    function adjust(what){
	if (what.buyerValues)
	    what.buyerValues = how(what.buyerValues, xfactor);
	if (what.sellerCosts)
	    what.sellerCosts = how(what.sellerCosts, xfactor);
	if (what.numberOfBuyers>1)
	    what.numberOfBuyers *= xfactor;
	if (what.numberOfSellers>1)
	    what.numberOfSellers *= xfactor;
    }
    const config = clone(_config);  // isolate changes
    if (config && (xfactor>1) && (typeof(how)==='function')){
	config.name += ' x'+xfactor;
	if (config.common)
	    adjust(config.common);
	if (Array.isArray(config.configurations))
	    config.configurations.forEach(adjust);
    }
    return config;
}

module.exports.expand = expand;

/**
 * collection of functions to use as "how" with expand, above 
 */

module.exports.expander = {
    interpolate: (a,n)=>{
	if (!a.length) return [];
        const result = [];
        for(let i=0,l=a.length;i<(l-1);++i){
            for(let j=0;j<n;++j){
                result.push((a[i]*(n-j)+a[i+1]*j)/n);
            }
        }
        const last = a[a.length-1];
        for(let j=0;j<n;++j)
            result.push(last);
        return result;
    },

    duplicate: (a,n)=>{
	if (!a.length) return [];
        const result = [];
        for(let i=0,l=a.length;i<l;++i){
            for(let j=0;j<n;++j){
                result.push(a[i]);
            }
        }
        return result;
    }
};


