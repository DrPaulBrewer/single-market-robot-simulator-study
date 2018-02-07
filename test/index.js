/* Copyright 2017- Paul Brewer, Economic and Financial Technology Consulting LLC */
/* This file is open source software.  The MIT License applies to this software. */

/* jshint mocha:true,browserify:true,esnext:true,eqeqeq:true,undef:true,lastsemic:true,strict:true */

"use strict";

const Study = require("../index.js");
const should = require('should');
const assert = require('assert');

const example1 = require('./example-config.json');
    

describe('Study ', function(){
    describe(' .pad() ', function(){
	it(' .pad(0.0) --> "00" ', function(){
	    Study.pad(0.0).should.equal('00');
	});
	it(' .pad(9.7) --> "09" ', function(){
	    Study.pad(9.7).should.equal('09');
	});
	it(' .pad(34)  --> "34" ', function(){
	    Study.pad(34).should.equal('34');
	});
    });
    describe(' .myDateStamp ', function(){
	it(' .myDateStamp(new Date(1517985461523)) --> "20180207T063741" ', function(){
	    Study.myDateStamp(new Date(1517985461523)).should.equal("20180207T063741");
	});
	it(' .myDateStamp() === .myDateStamp(new Date()) [usually] ', function(){
	    Study.myDateStamp().should.equal(Study.myDateStamp(new Date()));
	});
    });
    describe(' let c = Study.commonFrom({ common: {a:4}, foo: "bar"}) ', function(){
	let c = Study.commonFrom({ common: {a:4}, foo: "bar"});
	it(' c({}) --> {a:4} ', function(){
	    c({}).should.deepEqual({a:4});
	});
	it(' c({a:1,b:9,e:23}) --> {a:4,b:9,e:23} ', function(){
	    c({a:1,b:9,e:23}).should.deepEqual({a:4,b:9,e:23});
	});
    });
    describe(' .paths ', function(){
	it(' .paths("/path/to/config.json",4,"trade.csv") --> ["/path/to/00/trade.csv","/path/to/01/trade.csv","/path/to/02/trade.csv","/path/to/03/trade.csv"] ',function(){
	    Study.paths("/path/to/config.json",4,"trade.csv").should.deepEqual([
		"/path/to/00/trade.csv",
		"/path/to/01/trade.csv",
		"/path/to/02/trade.csv",
		"/path/to/03/trade.csv"]);
	});
	it(' .paths("/path/to/config.json",3) --> ["/path/to/00/","/path/to/01/","/path/to/02/","/path/to/03/"] ',function(){
	    Study.paths("/path/to/config.json",3).should.deepEqual([
		"/path/to/00/",
		"/path/to/01/",
		"/path/to/02/"]);
	});
    });
    describe(' .makeClassicSimulations ', function(){
	function mysim(s){ Object.assign(this, s); }
	it(' .makeClassicSimulations({ common: {a:1}, configurations: [{},{a:0,b:3},{z:8}] },mysim) --> [new mysim({caseid:0, a:1}), new mysim({caseid:1,a:1,b:3}), new mysim({caseid:2, a:1,z:8})] ',
	   function(){
	       var sims = Study.makeClassicSimulations({
		   common: {a:1},
		   configurations: [
		       {},
		       {a:0,b:3},
		       {z:8}
		   ]
	       }, mysim);
	       sims.should.deepEqual([
		   new mysim({caseid:0,a:1}),
		   new mysim({caseid:1,a:1,b:3}),
		   new mysim({caseid:2,a:1,z:8})
	       ]);
	   });
    });
    describe(' .metaSummary ', function(){
	const name = "Example-1";
	const periods = ''+100;
	const numberOfConfigurations = 1;
	// number of buyers, number of sellers omitted because in example1 these are defined in "configurations", not in "common", and metaSummary uses "common" only
	const manualMeta = {name, periods, numberOfConfigurations};
	it(' .metaSummary(example1) --> '+JSON.stringify(manualMeta), function(){
	    Study.metaSummary(example1).should.deepEqual(manualMeta);
	});
    });
});


