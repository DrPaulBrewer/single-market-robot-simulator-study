/* Copyright 2017- Paul Brewer, Economic and Financial Technology Consulting LLC */
/* This file is open source software.  The MIT License applies to this software. */


import clone from 'clone';
import fastDeepEqual from 'fast-deep-equal';
import intersect from 'intersect';

export function pad(z){
    const x = Math.floor(+z);
    if ((x===undefined) || (Number.isNaN(x)))
        throw new Error("pad: expected numeric input");
    return (x<10)? ("0"+x) : (''+x);
}

export function myDateStamp(thedate){
    const now = thedate || new Date();
    return ( ''+ now.getUTCFullYear() +
             pad(now.getUTCMonth() + 1) +
             pad(now.getUTCDate()) +
             'T' + pad(now.getUTCHours()) +
             pad(now.getUTCMinutes()) +
             pad(now.getUTCSeconds())
           );
}

export function numberOfSimulations(config){
    return (
      ( config && config.morph && config.morph.numberOfConfigurations ) ||
      ( config && Array.isArray(config.configurations) && config.configurations.length ) ||
      0
    );
}

/**
 * creates a function that clones input object, and then overrides some properties with those in a clone of obj.com
 mon
 * @param {Object} obj object with a .common property, obj.common should also be an object
 * @return {function(c: Object):Object} clone of c with properties overridden by obj.common
 */

export function commonFrom(obj){
    return function(c){
        const result =  Object.assign({},clone(c),clone(obj.common));
        return result;
    };
}


/**
 *
 * creates a list of directory or file paths where individual simulation data may be found, given a study's config.json file
 *
 * @param {string} pathToStudyJSON path to the study "config.json" file
 * @param {number} numberOfConfigurations the number of configurations, e.g. Study.numberOfSimulations or for simple cases study.configurations.length
 * @param {filename} filename to append to resulting path in each directory
 * @return {string[]}
 */

export function paths(pathToStudyJSON, numberOfConfigurations,filename){
    const list = [];
    const pathArray = pathToStudyJSON.split('/');
    const depth = pathArray.length;
    const f = filename || '';
    for(let j=0,l=numberOfConfigurations;j<l;++j){
      pathArray[depth-1] = pad(j)+'/'+f;
      list.push(pathArray.join('/'));
    }
    return list;
}

/**
 * Create new simulations from ~ Jan-2017 original study cfg format
 * @param {Object} cfg The study configuration
 * @param {Array<Object>} cfg.configurations An array of SMRS.Simulation() configurations, one for each independent simulation in a study.
 * @param {Object} cfg.common Common simulation configuration settings to be forced in all simulations. (if there is a conflict, common has priority over and overrides configurations)
 * @param {Object} Simulation A reference to the (possibly forked) single-market-robot-simulator.Simulation constructor function
 * @param {Array<number>} subset (optional) Defaults to "all".  An array of indices for which to produce simulations
 * @return {Array<Object>} array of new SMRS.Simulation - each simulation will be initialized but not running
 */

export function makeClassicSimulations(cfg, Simulation, subset){
    if (!cfg) return [];
    if (!(Array.isArray(cfg.configurations))) return [];
    let configurations = [];
    if (Array.isArray(subset)){
       configurations = subset.map((v) => (cfg.configurations[v]));
    } else {
      configurations = cfg.configurations;
    }
    configurations = clone(configurations); // prevent side effects
    configurations.forEach((s,j) => {
        if (!s.caseid)
            s.caseid = ( (subset && subset[j]) || j);
    });
    return (configurations
            .map(commonFrom(cfg))
            .map((s)=>(new Simulation(s)))
           );
}

/**
 * Analyses config file and array of sims to create zipFile metadata
 * returns { description, properties } for study zipFile metadata in a cloud storage system
 *
 */

export function zipMetadata({cfg, sims, periods, logs}){
    const forFolder = cfg && cfg.name;
    const properties = { forFolder };
    if (Array.isArray(sims)){
      try {
        properties.logs = Object.keys(sims[0].logs).sort().join(' ');
      } catch(e){ console.log("zipMetadata:logs", e); }
      try {
        const periodsForEachSim = sims.map((s)=>(s.period)).filter((n)=>(n>0));
        properties.periods = ''+Math.max(0,...periodsForEachSim);  // should be string
      } catch(e){ console.log("zipMetadata:periods", e); }
    }
    if (Array.isArray(logs)) properties.logs = logs.sort().join(' ');
    if (periods>0) properties.periods = ''+periods;
    const description = JSON.stringify(properties,null,2);
    return { properties, description };
 }

/**
 * collection of functions to use as "how" with expand, below
 */

export const expander = {
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

/**
 * clones study _config and modifies it for expansion.
 * If the number of buyers or sellers is 1, that number is unchanged.  Otherwise, multiplies the number of buyers and sellers by xfactor.
 * .buyerValues and .sellerCosts arrays in the current study are updated using supplied function how.  " x"+factor is appended to study name.
 */

export function expand(_config, xfactor, how){
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


/**
 * returns properties of config.configurations that are identical
 * across all configurations.
 *
 * special case:  if config.configurations.length<=1 returns empty array [];
 */

// what if cprop is array? may not quite be what we want

export function unvaryingInConfigurations(config, cprop){
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

export function assignToCommon(_config, change){
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
    throw new Error("Study.assignToCommon: invalid change, got: "+change);
}

/**
 * first, delete any configuration properties that are also in common, as these are overriden anyway
 * next, if there are two or more configurations, move all unvarying properties to common
 *
 */

export function simplify(_config){
    const config = assignToCommon(_config, Object.keys(_config.common));
    const propsToSimplify = unvaryingInConfigurations(config);
    return assignToCommon(config, propsToSimplify);
}

/**
 * If change is an Array, it is interpreted as a list of properties.
 * each property is deleted from config.common and the same property/value set
 * in each of the .configurations
 *
 * If change is an object, then its properties and values are assigned to
 * each of the configurations and its properties deleted from .common
 *
 */

export function assignToConfigurations(_config, change){
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
        return config;
    }
    throw new Error("Study.assignToConfigurations: invalid change, got: "+change);
}


export const morpher = {
    interpolate: (x0,x1,r) => {
        if (Array.isArray(x0) &&
            Array.isArray(x1) &&
            x0.every((x)=>(isFinite(x))) &&
            x1.every((x)=>(isFinite(x))))
             return x0.map((v,j)=>(v*(1-r)+x1[j]*r));
        const n0 = +x0;
        const n1 = +x1;
        if (isFinite(n0) && isFinite(n1)){
          const calculation = n0*(1-r)+n1*r;
          // preserve string type
          if (typeof(x0)==='string') return (''+calculation);
          return calculation;
        }
        throw new Error("Study.morpher.interpolate requires number, numeric string, or number array");
    },
    left: (x0,x1,r) => {
        if (Array.isArray(x0) && Array.isArray(x1)){
            const n = Math.round(r*x0.length);
            return [].concat(x1.slice(0,n),x0.slice(n));
        }
        throw new Error("Study.morpher.left requires array");
    },
    right: (x0,x1,r) => {
        if (Array.isArray(x0) && Array.isArray(x1)){
            const n = Math.round(r*x0.length);
            return [].concat(x0.slice(0,x0.length-n),x1.slice(x1.length-n));
        }
        throw new Error("Study.morpher.right requires array");
    }
};


export function intersectKeys(objectA, objectB){
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

export function isMorphable(A,B){
    function isValueMorphable(a,b){
        const tA = typeof(a);
        const tB = typeof(b);
        if (tA!==tB) return false;
        if (tA==='number') return (isFinite(a) && isFinite(b));
        if (tA==='string') return (isFinite(+a) && isFinite(+b));
        if (Array.isArray(a)){
            if (a.length===0) return false;
            if (!Array.isArray(b)) return false;
            if (b.length===0) return false;
            const badentries = [a,b].some(
              (x)=>x.some((v)=>((v===undefined) || (v===null) || ((typeof(v)==='number') && (!isFinite(v)))))
            );
            if (badentries) return false;
            const basetype = typeof(a[0]);
            const sameTypes = [a,b].every(
                (x)=>x.every((v)=>(typeof(v)===basetype))
              );
            return sameTypes;
        }
        return false;
      }
    const keys = intersectKeys(A,B);
    if (keys.length===0) return false;
    return keys.every((k)=>(isValueMorphable(A[k],B[k])));
}

/**
 * Returns a JSON Schema useful for requesting a morph configuraiton from the user
 */

export function morphSchema(A,B, unverifiedNumberOfConfigurations = 4){
    const suggestedNumberOfConfigurations = Math.floor(unverifiedNumberOfConfigurations);
    const schema = {
        "title": "morph",
        "type": "object",
        "default": { numberOfConfigurations: suggestedNumberOfConfigurations },
        "options": {
            "collapsed": false
        },
        "properties": {
            "numberOfConfigurations": {
                "description": "total number of configurations including first and last",
                "type": "integer",
                "default": suggestedNumberOfConfigurations,
                "minimum": 3,
                "maximum": 101
            }
        }
    };
    function addPropertyToSchema({k, choices, def}){
        schema.properties[k] = {
            "description": 'transformation for '+k,
            "type": "string",
            "enum": choices,
            "default": def
        };
        schema.default[k] = def;
    }
    if (!(suggestedNumberOfConfigurations >= 3))
      throw new Error("Study.morphSchema requires suggestedNumberOfConfigurations>=3 ");
    const keys = intersectKeys(A,B);
    if (!keys || keys.length===0)
        throw new Error("Study.morphSchema requires configurations with non-empty key intersection");
    keys.forEach((k)=>{
        if (Array.isArray(A[k])){
            const T = typeof(A[k][0]);
            const choices = ["ignore","left","right"];
            let def = 'left';
            if (T==='number'){
                choices.push("interpolate");
                if ((k==='buyerValues') || (k==='sellerCosts'))
                    def = 'interpolate';
            }
            addPropertyToSchema({k, choices, def});
        } else if (typeof(A[k])==='number'){
            const choices = ["ignore","interpolate"];
            const def = "interpolate";
            addPropertyToSchema({k, choices, def});
        } else if (typeof(A[k])==='string'){
            if (isFinite(+A[k]) && isFinite(+B[k])){
              const choices = ["ignore","interpolate"];
              const def = "interpolate";
              addPropertyToSchema({k, choices, def});
            } else {
              const choices = ["ignore","interpolate"];
              const def = "ignore";
              addPropertyToSchema({k, choices, def});
            }
        }
    });
    return schema;
}


function explicitlyExpandToFitNumberOfAgents(common,cfg,k){
    let nAgents = 0;
    if (k.startsWith("buyer")){
        nAgents = common.numberOfBuyers;
        if (!nAgents) throw new Error("Study.morph requires .common.numberOfBuyers to be a positive integer, got: "+nAgents);
    } else if (k.startsWith("seller")){
        nAgents = common.numberOfSellers;
        if (!nAgents) throw new Error("Study.morph requires .common.numberOfSellers to be a positive integer, got: "+nAgents);
    }
    const original = clone(cfg[k]);
    const l = original.length;
    cfg[k] = (
      new Array(nAgents)
      .fill(0)
      .map((v,j)=>(original[j%l]))
    );
}

export function morph(_config, morphConfig){
    const config = clone(_config);
    const nConfig = morphConfig.numberOfConfigurations;
    if ((typeof(nConfig)!=='number') || (!(nConfig>2)))
        throw new Error("morph: morphConfig.numberOfConfigurations must be a number greater than 2, got: "+nConfig);
    const A = config.configurations[0];
    const B = config.configurations[config.configurations.length-1];
    config.configurations = (
      new Array(nConfig)
      .fill(0)
      .map(()=>({}))
    );
    config.configurations[0]=clone(A);
    config.configurations[nConfig-1]=clone(B);
    const preExpandList = ['buyerAgentType','sellerAgentType','buyerRate','sellerRate'];
    [A,B].forEach((X)=>(preExpandList.forEach((k)=>{ if (X[k]) explicitlyExpandToFitNumberOfAgents(config.common,X,k); })));
    (Object
      .keys(morphConfig)
      .filter((k)=>(k!=='numberOfConfigurations') && (morphConfig[k]!=='ignore'))
      .forEach((k)=>{
        const morphFunc = morpher[morphConfig[k]];
        for(let i=1;i<(nConfig-1);i++){
            config.configurations[i][k] = morphFunc(A[k],B[k],i/(nConfig-1));
        }
      })
    );
    return config;
}

export function makeSimulations(cfg, Simulation, subset){
    if (!cfg || !cfg.morph){
        return makeClassicSimulations(cfg, Simulation, subset);
    }
    const morphedConfig = morph(cfg, cfg.morph);
    return makeClassicSimulations(morphedConfig, Simulation, subset);
}

/**
  * Simple studies are those that vary only one single-valued property.
  * The axis key is the single-valued property.
  * The axis values are the values of the single-valued property in each simulation.
  */

function asSingleNumber(v){
  if (typeof(v)==='number'){
    if (Number.isNaN(v)) return undefined;
    return v;
  }
  if (typeof(v)==='string'){
    return asSingleNumber(+v);
  }
  if (Array.isArray(v) && (v.length>=1) && v.every((x)=>(x===v[0]))) return asSingleNumber(v[0]);
  if (
    (typeof(v)==='object') &&
    (v!==null) &&
    (Object.keys(v).length===1)
  ){
    return asSingleNumber(Object.values(v)[0]);
  }
  return undefined;
}

export function axis(cfg){
  if (cfg.morph){
    // for axis to co-exist with morph, morph = { numberOfConfigurations, property: "interpolate"}
    if (Object.keys(cfg.morph).length!==2)
      return null;
    if (!Object.values(cfg.morph).includes("interpolate"))
      return null;
  }
  const configs = cfg.configurations;
  if (!Array.isArray(configs) || (configs.length===0))
    return null;
  if (Object.keys(configs[0]).length!==1)
    return null;
  const firstKey = Object.keys(configs[0])[0];
  const isOnlyKey = configs.every((item)=>(Object.keys(item).length===1 && Object.keys(item)[0]===firstKey));
  let result = null;
  if (isOnlyKey){
    if (cfg.morph){
      const morphedConfig = morph(cfg, cfg.morph);
      result = {
        key: firstKey,
        values: morphedConfig.configurations.map(asSingleNumber)
      };
    } else {
    // else -- not morphing
      result = {
        key: firstKey,
        values: configs.map(asSingleNumber)
      };
    }
    if (result.values.some((v)=>((typeof(v)!=='number') || !isFinite(v))))
      result = null;
  }
  // not the only key in configs, not a simple study
  return result;
}
