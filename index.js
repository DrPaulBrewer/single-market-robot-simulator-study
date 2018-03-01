/* Copyright 2017- Paul Brewer, Economic and Financial Technology Consulting LLC */
/* This file is open source software.  The MIT License applies to this software. */

/* jshint browserify:true,esnext:true,eqeqeq:true,undef:true,lastsemic:true,strict:true,unused:true */

const clone = require('clone');
const fastDeepEqual = require('fast-deep-equal');
const intersect = require('intersect');

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
 * collection of functions to use as "how" with expand, below
 */

const expander = {
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

module.exports.expander = expander;

/**
 * clones study _config and modifies it for expansion.
 * If the number of buyers or sellers is 1, that number is unchanged.  Otherwise, multiplies the number of buyers and sellers by xfactor.
 * .buyerValues and .sellerCosts arrays in the current study are updated using supplied function how.  " x"+factor is appended to study name. 
 */

function expand(_config, xfactor, how){
    function adjust(what){
	// what will be either config.common or config.configurations[n] for some n
	function dup1to1AgentArrayProps(props){
	    const prevNumberOfBuyers = _config.common.numberOfBuyers || what.numberOfBuyers;
	    const prevNumberOfSellers = _config.common.numberOfSellers || what.numberOfSellers;
	    props.forEach((prop)=>{
		const checkLength = (prop.toLowerCase().includes("buyer"))? prevNumberOfBuyers: prevNumberOfSellers;
		if (Array.isArray(what[prop]) && (checkLength>1) && (what[prop].length===checkLength)){
		    what[prop] = expander.duplicate(what[prop], xfactor);
		}
	    });
	}
	if (what.buyerValues)
	    what.buyerValues = how(what.buyerValues, xfactor);
	if (what.sellerCosts)
	    what.sellerCosts = how(what.sellerCosts, xfactor);
	dup1to1AgentArrayProps(Object.keys(what).filter((prop)=>((prop!=='buyerValues') && (prop.startsWith("buyer")))));
	dup1to1AgentArrayProps(Object.keys(what).filter((prop)=>((prop!=='sellerCosts') && (prop.startsWith("seller")))));
	if (what.numberOfBuyers>1){
	    what.numberOfBuyers *= xfactor;
	}
	if (what.numberOfSellers>1){
	    what.numberOfSellers *= xfactor;
	}
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
 * returns properties of config.configurations that are identical
 * across all configurations.
 *
 * special case:  if config.configurations.length<=1 returns empty array [];
 */

// what if cprop is array? may not quite be what we want

function unvaryingInConfigurations(config, cprop){
    if (config.configurations.length <= 1)
	return (cprop)? false: [];
    const A = config.configurations[0];
    const propsTested = (cprop && [cprop]) || Object.keys(A);
    const unvaryingList = propsTested.filter(
	(prop)=>(config
		 .configurations
		 .every(
		     (caseConfig)=>(fastDeepEqual(A[prop],caseConfig[prop]))
		 )
		)
    );
    return (cprop)? (unvaryingList.length===1): unvaryingList;
}

module.exports.unvaryingInConfigurations = unvaryingInConfigurations;

/**
 * Moves configuration information from .configurations to .common
 *
 * if change is an Array, all properties in the Array are deleted in all configurations and if unset
 * in common, are set from the first defined configuration
 *
 * if change is an Object, its props/values are set in .common and deleted in all configurations
 * 
 *
 * if change is an object, its properties are included into common,
 * and deleted from any of the .configurations
 */

function assignToCommon(_config, change){
    const config = clone(_config);
    if (Array.isArray(change)){
	change.forEach((prop)=>{
	    if (config.common[prop]===undefined){
		let caseConf  = config.configurations.find((caseConfig)=>(caseConfig[prop]!==undefined));
		if (caseConf) config.common[prop] = clone(caseConf[prop]);
	    }
	    config.configurations.forEach((caseConfig)=>{
		delete caseConfig[prop];
	    });
	});
	return config;
    }
    if (typeof(change)==='object'){
	Object.assign(config.common, clone(change));
	Object.keys(change).forEach((prop)=>(config.configurations.forEach((caseConfig)=>{
	    delete caseConfig[prop];
	})));
	return config;
    }
    return config;
}

module.exports.assignToCommon = assignToCommon;

/**
 * If change is an Array, it is interpreted as a list of properties.
 * each property is deleted from config.common and the same property/value set
 * in each of the .configurations
 *
 * If change is an object, then its properties and values are assigned to
 * each of the configurations and its properties deleted from .common
 *
 */

function assignToConfigurations(_config, change){
    const config = clone(_config);
    if (Array.isArray(change)){
	change.forEach((prop)=>{
	    let commonval = config.common[prop];
	    if (typeof(commonval)!=='undefined'){
		config.configurations.forEach((caseConfig)=>{
		    caseConfig[prop] = clone(commonval);
		});
	    }
	    delete config.common[prop];
	});
	return config;
    }
    if (typeof(change)==='object'){
	config.configurations.forEach((caseConfig)=>{
	    Object.assign(caseConfig, clone(change));
	});
	Object.keys(change).forEach((prop)=>{ delete config.common[prop]; });
    }
    throw new Error("Study.assignToConfigurations: invalid change, got: "+change);
}
	
    
module.exports.assignToConfigurations = assignToConfigurations;

const morpher = {
    interpolate: (x0,x1,r) => {
	if (Array.isArray(x0))
	    return x0.map((v,j)=>(v*(1-r)+x1[j]*r));
	if (typeof(x0)==='number')
	    return x0*(1-r)+x1*r;
	throw new Error("Study.morpher.interpolate requires number or number array");
    },
    left: (x0,x1,r) => {
	if (Array.isArray(x0)){
	    const n = Math.round(r*x0.length);
	    return [].concat(x1.slice(0,n),x0.slice(n));
	}
	throw new Error("Study.morpher.left requires array");
    },
    right: (x0,x1,r) => {
	if (Array.isArray(x0)){
	    const n = Math.round(r*x0.length);
	    return [].concat(x0.slice(0,x0.length-n),x1.slice(x1.length-n));
	}
	throw new Error("Study.morpher.right requires array");
    }
};

module.exports.morpher = morpher;

function commonKeys(objectA, objectB){
    if ((typeof(objectA)!=='object') || (typeof(objectB)!=='object') || (objectA===null) || (objectB===null))
	return [];
    return intersect(Object.keys(objectA), Object.keys(objectB));
}

/**
 * Checks if Study.morph can be safely run on config.
 * These requirements are imposed on the supplied .configuration elements (usually first as A and last as B)
 *   + common keys exist in the first and last configurations
 *   + each common key has the same type in the first and last configurations, and each key's value is a number or array<number> or array<string>
 *   + if the values are arrays they are of the same length and have a common type
 *
 *  returns Boolean 
 */

function isMorphable(A,B){
    function isValueMorphable(a,b){
	const tA = typeof(a);
	const tB = typeof(b);
	if (tA!==tB) return false;
	if (tA==='number') return true;
	if (Array.isArray(a)){
	    if (!Array.isArray(b)) return false;
	    if ((a.length===0) || (a.length!==b.length)) return false;
	    // use a simple for loop here because
	    // higher-order methods like .forEach don't see holes in arrays
	    const T = typeof(a[0]);
	    if ((T==='number') || (T==='string')){
		for(var i=0,l=a.length;i<l;++i){
		    if ((typeof(a[i])!==T) || (typeof(b[i])!==T))
			return false;
		}
		return true;
	    }
	}
	return false;
    }
    const common = commonKeys(A,B);
    if (common.length===0) return false;
    return common.all((k)=>(isValueMorphable(A[k],B[k])));
}

module.exports.isMorphable = isMorphable;

function morphSchema(A,B){
    const common = commonKeys(A,B);
    const schema = {
	"title": "morph",
	"type": "object",
	"default": {},
	"options": {
	    "collapsed": false,
	},
	"properties": {
	}
    };
    common.forEach((k)=>{
    });
    return schema;
}
