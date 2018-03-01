/* Copyright 2017- Paul Brewer, Economic and Financial Technology Consulting LLC */
/* This file is open source software.  The MIT License applies to this software. */

/* jshint mocha:true,browserify:true,esnext:true,eqeqeq:true,undef:true,lastsemic:true,strict:true */

"use strict";

const Study = require("../index.js");
const should = require('should');
const assert = require('assert');

const example1 = require('./example1.json');
const clone = require('clone');
const fastDeepEqual = require('fast-deep-equal');

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
    describe(' .expander', function(){
	describe(' .interpolate ', function(){
	    const tests = [
		[ [[200,150,100,50,0],2], [200,175,150,125,100,75,50,25,0,0] ],
		[ [[2100,1800,1200,300,0], 3], [2100,2000,1900,1800,1600,1400,1200,900,600,300,200,100,0,0,0] ],
		[ [[10,20],10], [10,11,12,13,14,15,16,17,18,19,20,20,20,20,20,20,20,20,20,20] ],
		[ [[100], 4], [100,100,100,100] ],
		[ [[], 5], [] ],
		[ [{}, 5], [] ],
		[ [undefined, 5], "throws"]
	    ];
	    tests.forEach(([params, goal])=>{
		it(' .interpolate('+JSON.stringify(params[0])+','+params[1]+') --> '+JSON.stringify(goal), function(){
		    if (Array.isArray(goal))
			Study.expander.interpolate.apply(null, params).should.deepEqual(goal);
		    if ((typeof(goal)==='string') && (goal.startsWith("throws")))
			( ()=>(Study.expander.interpolate.apply(null, params)) ).should.throw();			
		});
	    });
	});
	describe(' .duplicate ', function(){
	    const tests = [
		[ [[200,150,100,50,0],2], [200,200,150,150,100,100,50,50,0,0] ],
		[ [[2100,1800,1200,300,0], 3], [2100,2100,2100,1800,1800,1800,1200,1200,1200,300,300,300,0,0,0] ],
		[ [[10,20],10], [10,10,10,10,10,10,10,10,10,10,20,20,20,20,20,20,20,20,20,20] ],
		[ [[100], 4], [100,100,100,100] ],
		[ [[], 5], [] ],
		[ [{}, 5], [] ],
		[ [undefined, 5], "throws"]
	    ];
	    tests.forEach(([params, goal])=>{
		it(' .duplicate('+JSON.stringify(params[0])+','+params[1]+') --> '+JSON.stringify(goal), function(){
		    if (Array.isArray(goal))
			Study.expander.duplicate.apply(null, params).should.deepEqual(goal);
		    if ((typeof(goal)==='string') && (goal.startsWith("throws")))
			( ()=>(Study.expander.duplicate.apply(null, params)) ).should.throw();			
		});
	    });
	});
    });
    describe(' .expand ', function(){
	const manualBuyerValues=new Array(80).fill(0).map((v,j)=>((j>75)? 5: (80-j)));
	const manualSellerCosts=new Array(50).fill(0).map((v,j)=>(j>45)? 100: (10+2*j));
	it(' .expand(example1,5,Study.expander.interpolate).common should match example1 common because costs and values are in .configurations', function(){
	    Study.expand(example1,5,Study.expander.interpolate).common.should.deepEqual(example1.common);
	});
	it(' .expand(example1,5,Study.expander.interpolate).configurations[0].buyerValues matches manual calculation ', function(){
	    Study.expand(example1,5,Study.expander.interpolate).configurations[0].buyerValues.should.deepEqual(manualBuyerValues);
	});
	it(' .expand(example1,5,Study.expander.interpolate).configurations[0].sellerCosts matches manual calculation ', function(){
	    Study.expand(example1,5,Study.expander.interpolate).configurations[0].sellerCosts.should.deepEqual(manualSellerCosts);
	});
	it (' expanded buyerRate, sellerRate, buyerAgentType, sellerAgentType matches original because each of these has only one setting in original ', function(){
	    const expanded = Study.expand(example1,5,Study.expander.interpolate).configurations[0];
	    ['buyerRate','sellerRate','buyerAgentType','sellerAgentType'].forEach((prop)=>{
		expanded[prop].should.deepEqual(example1.configurations[0][prop]);
	    });
	});
	it(' .expand(example1,5,Study.expander.interpolate) increases number of buyers and sellers to 50 ', function(){
	    let {numberOfBuyers, numberOfSellers } = Study.expand(example1,5,Study.expander.interpolate).configurations[0];
	    numberOfBuyers.should.equal(50);
	    numberOfSellers.should.equal(50);
	});
	it(' .expand(example1,7,Study.expander.duplicate) appends x7 to .name ', function(){
	    assert.ok(Study.expand(example1,7,Study.expander.duplicate).name.endsWith("x7"));
	});
	it(' example1Z with 7 ZIAgent and 3 MidpointAgent agents when expanded x3 becomes 21 ZIAgent followed by 9 MidpointAgent ', function(){
	    const cases = [];
	    cases.push(clone(example1));
	    cases.push(Study.assignToCommon(example1, ['numberOfBuyers','numberOfSellers']));
	    cases.forEach((example1Z)=>{
		example1Z.configurations[0].buyerAgentType = [].concat(new Array(7).fill('ZIAgent'), new Array(3).fill('MidpointAgent'));
		const x3Example1Z = Study.expand(example1Z, 3, Study.expander.interpolate);
		x3Example1Z.configurations[0].buyerAgentType.should.deepEqual([].concat(new Array(21).fill('ZIAgent'), new Array(9).fill('MidpointAgent')));
		x3Example1Z.configurations[0].sellerAgentType.should.deepEqual(example1Z.configurations[0].sellerAgentType);
	    });
	});
    });
    describe(' .unvaryingInConfigurations ', function(){
	it(' .unvaryingInConfigurations(example1) --> [] ', function(){
	    Study.unvaryingInConfigurations(example1).should.deepEqual([]);
	});
	describe(' example1A clones configurations[0] to configurations[1] ', function(){
	    it(' .unvaryingInConfigurations(example1A) --> [all config props]', function(){
		const allConfigProps = Object.keys(example1.configurations[0]);
		const example1A = clone(example1);
		example1A.configurations[1] = clone(example1A.configurations[0]);
		Study.unvaryingInConfigurations(example1A).should.deepEqual(allConfigProps);
	    });
	});
	describe(' example1B uses different buyerValues in configurations[1] ', function(){
	    it(' .unvaryingInConfigurations(example1B) --> [all except buyerValues] ', function(){
		const allConfigProps = Object.keys(example1.configurations[0]);
		const expected = allConfigProps.filter((prop)=>(prop!=='buyerValues'));
		const example1B = clone(example1);
		example1B.configurations[1] = clone(example1B.configurations[0]);
		example1B.configurations[1].buyerValues = example1B.configurations[0].buyerValues.map((v)=>(2*v));
		example1B.configurations[0].should.not.deepEqual(example1B.configurations[1]);
		Study.unvaryingInConfigurations(example1B,'buyerValues').should.equal(false);
		Study.unvaryingInConfigurations(example1B,'sellerCosts').should.equal(true);
		Study.unvaryingInConfigurations(example1B).should.deepEqual(expected);
	    });
	});
    });
    describe(' .assignToCommon ', function(){
	describe('.assignToCommon(example1,["buyerValues"]) ', function(){
	    const example1A = clone(example1);
	    const bv = example1A.configurations[0].buyerValues;
	    const example1AMod = Study.assignToCommon(example1A, ['buyerValues']);
	    it('original study input object is unmodified', function(){
		example1A.should.deepEqual(example1);
	    });
	    it('output has .buyerValues in common with value taken from configurations[0]', function(){
		example1AMod.common.should.have.properties(['buyerValues']);
		example1AMod.common.buyerValues.should.deepEqual(example1A.configurations[0].buyerValues);
	    });
	    it('output does not have .buyerValues in configurations[*]', function(){
		assert.ok(example1AMod.configurations[0].buyerValues===undefined);
	    });
	    it('output is immune to obvious reference copying/meddling ', function(){
		bv[0] = 1;
		example1A.configurations[0].buyerValues[0].should.equal(1);
		example1AMod.common.buyerValues[0].should.not.equal(1);
	    });
	});
	describe('.assignToCommon(example1, { buyerRate: [0.5], sellerRate: [0.3] } ', function(){
	    const example1A = clone(example1);
	    const br = example1A.configurations[0].buyerRate;
	    const change = { buyerRate: [0.5], sellerRate: [0.3] };
	    const example1AMod = Study.assignToCommon(example1A, change);
	    it('original study input object is unmodified', function(){
		example1A.should.deepEqual(example1);
	    });
	    it('output has .common.buyerRate and .common.sellerRate with above values ', function(){
		example1AMod.common.should.have.properties(['buyerRate','sellerRate']);
		example1AMod.common.buyerRate.should.deepEqual(change.buyerRate);
		example1AMod.common.sellerRate.should.deepEqual(change.sellerRate);
	    });
	    it('output does not have .buyerRate or .sellerRate in configurations', function(){
		assert.ok(example1AMod.configurations[0].buyerRate===undefined);
		assert.ok(example1AMod.configurations[0].sellerRate===undefined);
	    });
	    it('output has disconnected references to change ', function(){
		assert(example1AMod.common.buyerRate!==change.buyerRate);
		assert(example1AMod.common.sellerRate!==change.sellerRate);
	    });
	}); 
    });
    describe(' .assignToConfigurations ', function(){
	describe('.assignToConfigurations(example1x2,["periodDuration"] ', function(){
	    const example1x2 = clone(example1);
	    example1x2.configurations[1] = clone(example1x2.configurations[0]);
	    const example1A = clone(example1x2);
	    const example1AMod = Study.assignToConfigurations(example1A, ['periodDuration']);
	    it('original study input object is unmodified', function(){
		example1A.should.deepEqual(example1x2);
	    });
	    it('output has .periodDuration in .configurations[*]', function(){
		example1AMod.configurations[0].periodDuration.should.equal(1000);
		example1AMod.configurations[1].periodDuration.should.equal(1000);
	    });
	    it('output does not have .periodDuration in .common', function(){
		example1AMod.common.should.not.have.property('periodDuration');
	    });
	});	
    });
    describe(' .morpher ', function(){
	const tests = [
	    [['left', [10,20,30], [50,60,70], 0.00], [10,20,30]],
	    [['left', [10,20,30], [50,60,70], 0.25], [50,20,30]],
	    [['left', [10,20,30], [50,60,70], 0.50], [50,60,30]],
	    [['left', [10,20,30], [50,60,70], 0.75], [50,60,30]],
	    [['left', [10,20,30], [50,60,70], 1.00], [50,60,70]],
	    [['right', [10,20,30], [50,60,70], 0.00], [10,20,30]],
	    [['right', [10,20,30], [50,60,70], 0.25], [10,20,70]],
	    [['right', [10,20,30], [50,60,70], 0.50], [10,60,70]],
	    [['right', [10,20,30], [50,60,70], 0.75], [10,60,70]],
	    [['right', [10,20,30], [50,60,70], 1.00], [50,60,70]],
	    [['interpolate', [10,20,30], [50,60,70], 0.00], [10,20,30]],
	    [['interpolate', [10,20,30], [50,60,70], 0.25], [20,30,40]],
	    [['interpolate', [10,20,30], [50,60,70], 0.50], [30,40,50]],
	    [['interpolate', [10,20,30], [50,60,70], 0.75], [40,50,60]],
	    [['interpolate', [10,20,30], [50,60,70], 1.00], [50,60,70]]
	];    
	tests.forEach(([[f, first,last,ratio], expected])=>{
	    it( ` Study.morpher.${f}([${first}],[${last}],${ratio}) --> [${expected}] `, function(){
		Study.morpher[f](first,last,ratio).should.deepEqual(expected);
	    });
	});
    });
    describe(' .isMorphable ', function(){
	const tests = [
		[ null, null, false],
		[ {a:1.0}, {b:2.0}, false]
	];
	tests.forEach(([A,B,expected])=>{
		it(` A = ${A} B=${B} --> ${expected} `, function(){
			Study.isMorphable(A,B).should.equal(expected);
		});
	});
    });    
});



