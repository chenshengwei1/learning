/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 1173);
/******/ })
/************************************************************************/
/******/ ({

/***/ 0:
/***/ (function(module, exports) {

module.exports = window;

/***/ }),

/***/ 1:
/***/ (function(module, exports) {

module.exports = $CPQ.exports;

/***/ }),

/***/ 1173:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "BesOccoreConfigurationElementNpaInfoPop", function() { return BesOccoreConfigurationElementNpaInfoPop; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__uee_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__uee_core___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0__uee_core__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__template_gadget_centrex_configuration_element_npa_info_pop_configuration_element_npa_info_pop_template__ = __webpack_require__(1174);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__bes_occore_configuration_element_npa_info_pop_meta__ = __webpack_require__(1175);
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};



var BesOccoreConfigurationElementNpaInfoPop = /** @class */ (function (_super) {
    __extends(BesOccoreConfigurationElementNpaInfoPop, _super);
    function BesOccoreConfigurationElementNpaInfoPop() {
        var _this = _super.call(this) || this;
        var gadgetId = _this.$GadgetId = Object(__WEBPACK_IMPORTED_MODULE_0__uee_core__["$$"])(_this).$Attrs['id'] || Object(__WEBPACK_IMPORTED_MODULE_0__uee_core__["$$"])(_this).$Attrs['name'];
        _this._BO && (_this._BO.$ProcessId = Object(__WEBPACK_IMPORTED_MODULE_0__uee_core__["$$"])(_this).$Attrs['refProcess']);
        _this._BO && (_this._BO.$TaskId = Object(__WEBPACK_IMPORTED_MODULE_0__uee_core__["$$"])(_this).$Attrs['refTask']);
        if (!_this.hasOwnProperty("$Meta") || !_this.$Meta) {
            _this.$Meta = __WEBPACK_IMPORTED_MODULE_2__bes_occore_configuration_element_npa_info_pop_meta__["a" /* $Meta */];
        }
        ['id', 'name'].forEach(function (attr) {
            var attrValue = Object(__WEBPACK_IMPORTED_MODULE_0__uee_core__["$$"])(_this).$Attrs[attr];
            $UEE.$gadgetInstances[attrValue] = _this;
            if ($UEE.$templateActionQueue && $UEE.$templateActionQueue[attrValue]) {
                for (var fn = void 0, queue = $UEE.$templateActionQueue[attrValue]; fn = queue.shift(); fn(_this))
                    ;
            }
            Object(__WEBPACK_IMPORTED_MODULE_0__uee_core__["$$"])(_this).$on("$destroy", function () {
                $UEE.$gadgetInstances[attrValue] = null;
                delete $UEE.$gadgetInstances[attrValue];
            });
        });
        return _this;
    }
    BesOccoreConfigurationElementNpaInfoPop.prototype.$OnInit = function () {
        var _this = this;
        _super.prototype.$OnInit.call(this);
        if (this.$Meta && this.$Meta.initActions) {
            this.$Meta.initActions.forEach(function (action) {
                _this.$InvokeAction(action);
            });
        }
    };
    BesOccoreConfigurationElementNpaInfoPop.prototype.getValidators = function () {
        var test = ['111'];
        return (test.length == 0) ? "" : test;
    };
    BesOccoreConfigurationElementNpaInfoPop = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__uee_core__["Component"])("bes-occore-configuration-element-npa-info-pop"),
        __metadata("design:paramtypes", [])
    ], BesOccoreConfigurationElementNpaInfoPop);
    return BesOccoreConfigurationElementNpaInfoPop;
}(__WEBPACK_IMPORTED_MODULE_1__template_gadget_centrex_configuration_element_npa_info_pop_configuration_element_npa_info_pop_template__["a" /* ConfigurationElementNpaInfoPopTemplate */]));



/***/ }),

/***/ 1174:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return ConfigurationElementNpaInfoPopTemplate; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__bes_occore_ui_common__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__bes_occore_ui_common___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0__bes_occore_ui_common__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__uee_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__uee_core___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1__uee_core__);
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};


var ConfigurationElementNpaInfoPopTemplate = /** @class */ (function (_super) {
    __extends(ConfigurationElementNpaInfoPopTemplate, _super);
    function ConfigurationElementNpaInfoPopTemplate() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.addParams = {};
        //可选“TEL”, “DDI”, "MLH" or "PLN"
        _this.dict = [];
        _this.modifyFlag = false;
        return _this;
    }
    //从前面主页面获取的所有数据
    //npaAttrs:any;
    ConfigurationElementNpaInfoPopTemplate.prototype.$OnInit = function () {
        //其他地方用的老接口，查询不到tel类型的6位数据。暂时加校验。6位数必须是ddi类型
        $.validator.addMethod("dataValidatorddi", function (value, element, param) {
            var inputValue = '' + value;
            //this.addParams
            var test2 = '^([A-Z]{2}TC+[0-9]{9})$';
            var $Scope = $(element).scope();
            var dn = $Scope.addParams.dn ? $Scope.addParams.dn : '';
            if (dn.length != 6) {
                return { result: true };
            }
            if (dn.length == 6 && inputValue == "DDI") {
                return { result: true };
            }
            return { result: false };
        }, __WEBPACK_IMPORTED_MODULE_1__uee_core__["$UEE"].i18n("DN is 6 digits. Please select 'DDI'."));
        $.validator.addMethod("dataValidator", function (value, element, param) {
            var inputValue = '' + value;
            var test2 = '^([A-Z]{2}TC+[0-9]{9})$';
            var $Scope = $(element).scope();
            var test = $Scope.addParams.rno ? $Scope.addParams.rno : '';
            //var $UEE = $Scope.$Get("$UEE");
            //var bo = $UEE.propertyValue($Scope, 'this.$BO(SalesOrderBO)');
            //var srdDate = bo.$Entity.orderInfo.orderExtraInfo.sRD;
            if (inputValue.indexOf(test) == 0) {
                return { result: true };
            }
            return { result: false };
        }, __WEBPACK_IMPORTED_MODULE_1__uee_core__["$UEE"].i18n("Please start with '2N Operator'."));
        $.validator.addMethod("dataValidator2", function (value, element, param) {
            var inputValue = '' + value;
            var reg = /^([A-Z]{2}TC+[0-9]{9})$/;
            if (reg.test(inputValue)) {
                return { result: true };
            }
            return { result: false };
        }, __WEBPACK_IMPORTED_MODULE_1__uee_core__["$UEE"].i18n("Ref Serial No. should be 13 characters and start with RNO+TC and end with 9 digits "));
        $.validator.addMethod("validatorNotToday", function (value, element, param) {
            debugger;
            //日期
            var time = (new Date(value));
            time.setHours(0);
            time.setMinutes(0);
            time.setSeconds(0);
            time.setMilliseconds(0);
            var currentDate = new Date(__WEBPACK_IMPORTED_MODULE_0__bes_occore_ui_common__["$CPQ"].getSystemDate());
            currentDate.setHours(0);
            currentDate.setMinutes(0);
            currentDate.setSeconds(0);
            currentDate.setMilliseconds(0);
            if (time.getTime() == currentDate.getTime()) {
                return { result: false };
            }
            return { result: true };
        }, "Can not select today.");
        if (!this.addParams) {
            this.addParams = new AddNpaInfoView();
        }
        this.dict = [{ 'VALUE': 'TEL', 'LABEL': 'TEL' }, { 'VALUE': 'DDI', 'LABEL': 'DDI' }, { 'VALUE': 'MLH', 'LABEL': 'MLH' }, { 'VALUE': 'PLN', 'LABEL': 'PLN' }];
    };
    ConfigurationElementNpaInfoPopTemplate.prototype.initData = function ($Params) {
        //this.npaAttrs=$Params.modifyMessage;
        //初始化给界面赋值
        if ($Params.modifyMessage) {
            this.modifyFlag = true;
            this.addParams = $Params.modifyMessage;
        }
    };
    ConfigurationElementNpaInfoPopTemplate.prototype.validateTime = function () {
        //必填校验
        if (!this.addParams.dn || !this.addParams.refSriNo || !this.addParams.batchDate || !this.addParams.nn || !this.addParams.custName || !this.addParams.idNo || !this.addParams.chgOvrDate) {
            Object(__WEBPACK_IMPORTED_MODULE_1__uee_core__["$$"])(this).$UI.msgbox.error('Error', 'Required not filled.');
            return 'FALSE';
        }
        var endTime = this.addParams.chgETime || '';
        var startTime = this.addParams.chgSTime;
        if (!startTime) {
            Object(__WEBPACK_IMPORTED_MODULE_1__uee_core__["$$"])(this).$UI.msgbox.error('Error', 'Change Over Start Time cannot be empty .');
            return 'FALSE';
        }
        if (!endTime) {
            Object(__WEBPACK_IMPORTED_MODULE_1__uee_core__["$$"])(this).$UI.msgbox.error('Error', 'Change Over End Time cannot be empty .');
            return 'FALSE';
        }
        if (startTime && endTime && endTime < startTime) {
            Object(__WEBPACK_IMPORTED_MODULE_1__uee_core__["$$"])(this).$UI.msgbox.error('Error', 'End time can not earlier than start time.');
            return 'FALSE';
        }
        return 'SUCCESS';
    };
    ConfigurationElementNpaInfoPopTemplate.prototype.getAddRequest = function () {
        return this.addParams;
    };
    ConfigurationElementNpaInfoPopTemplate.prototype.confirm = function () {
        return __awaiter(this, void 0, void 0, function () {
            var chgSTime, chgETime, newAddParams, request, boolean, chgSTime, chgETime, newAddParams, request, boolean;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.modifyFlag) return [3 /*break*/, 2];
                        chgSTime = this.addParams.chgSTime;
                        chgETime = this.addParams.chgETime;
                        newAddParams = this.addParams;
                        newAddParams.chgSTime = chgSTime;
                        newAddParams.chgETime = chgETime;
                        request = newAddParams;
                        return [4 /*yield*/, this.modifyNpaInfo(request)];
                    case 1:
                        boolean = _a.sent();
                        return [3 /*break*/, 4];
                    case 2:
                        chgSTime = this.formatDate(this.addParams.chgSTime);
                        chgETime = this.formatDate(this.addParams.chgETime);
                        newAddParams = this.addParams;
                        newAddParams.chgSTime = chgSTime;
                        newAddParams.chgETime = chgETime;
                        newAddParams.createTime = new Date(__WEBPACK_IMPORTED_MODULE_0__bes_occore_ui_common__["$CPQ"].getSystemDate()).getTime();
						newAddParams.createProleId = __WEBPACK_IMPORTED_MODULE_0__bes_occore_ui_common__["$CPQ"].getOperatorId();
						newAddParams.createDeptId = __WEBPACK_IMPORTED_MODULE_0__bes_occore_ui_common__["$CPQ"].getDeptId();
                        request = newAddParams;
                        return [4 /*yield*/, this.addNpaInfo(request)];
                    case 3:
                        boolean = _a.sent();
                        _a.label = 4;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    ConfigurationElementNpaInfoPopTemplate.prototype.formatDate = function (tempDate) {
        var date = new Date(tempDate);
        var hour;
        var minutes;
        if (String(date.getHours()).length == 2) {
            hour = date.getHours();
        }
        else {
            hour = '0' + date.getHours();
        }
        if (String(date.getMinutes()).length == 2) {
            minutes = (date.getMinutes().toFixed());
        }
        else {
            minutes = '0' + (date.getMinutes().toFixed());
        }
        return hour + ":" + minutes;
    };
    ConfigurationElementNpaInfoPopTemplate.prototype.addNpaInfo = function (request) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                result = new Promise(function (resolve) {
                    Object(__WEBPACK_IMPORTED_MODULE_1__uee_core__["$Fire"])({
                        service: "/cpq/base_hkt/component/querynpaportoutnumberboservice/addnpainfo",
                        params: {
                            request: request
                        },
                        target: "response",
                        onafter: function (response) {
                            resolve(response);
                        }
                    });
                });
                return [2 /*return*/, result];
            });
        });
    };
    ConfigurationElementNpaInfoPopTemplate.prototype.modifyNpaInfo = function (request) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                result = new Promise(function (resolve) {
                    Object(__WEBPACK_IMPORTED_MODULE_1__uee_core__["$Fire"])({
                        service: "/cpq/base_hkt/component/querynpaportoutnumberboservice/modifynpainfo",
                        params: {
                            request: request
                        },
                        target: "response",
                        onafter: function (response) {
                            resolve(response);
                        }
                    });
                });
                return [2 /*return*/, result];
            });
        });
    };
    return ConfigurationElementNpaInfoPopTemplate;
}(__WEBPACK_IMPORTED_MODULE_0__bes_occore_ui_common__["CPQGadgetTemplate"]));

var AddNpaInfoView = /** @class */ (function () {
    function AddNpaInfoView() {
    }
    return AddNpaInfoView;
}());


/***/ }),

/***/ 1175:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return $Meta; });
var $Meta = {
    "name": "bes:occore-configuration-element-npa-info-pop",
    "refTemplate": "configuration-element-npa-info-pop",
    "attrs": {
        "displayName": "ADD NPA INFO",
        "version": "1.0"
    },
    "cells": {
        "addnpainfo": {
            "items": [
                {
                    "fields": [
                        {
                            "property": "dn",
                            "label": "DN",
                            "required": true,
                            "validator": "regExp('^([1-9]{1}[0-9]{5})([0-9]{2})?$')",
                            "ctrlType": "input"
                        },
                        {
                            "property": "refSriNo",
                            "label": "Ref Serial No.",
                            "required": true,
                            "ctrlType": "input",
                            "validator": "dataValidator;dataValidator2"
                        },
                        {
                            "property": "batchDate",
                            "label": "Batch Date",
                            "required": true,
                            "ctrlType": "date",
                            "validator": "afterToday;validatorNotToday;"
                        },
                        {
                            "property": "nn",
                            "label": "NN",
                            "required": true,
                            "ctrlType": "input",
                            "validator": "number;maxlength(15)"
                        },
                        {
                            "property": "custName",
                            "label": "Customer Name",
                            "validator": "maxlength(60)",
                            "required": true,
                            "ctrlType": "input"
                        },
                        {
                            "property": "idNo",
                            "label": "ID No.",
                            "validator": "maxlength(20)",
                            "required": true,
                            "ctrlType": "input"
                        },
                        {
                            "property": "chgOvrDate",
                            "label": "Change Over Date",
                            "validator": "beforeToday('yyyy/MM/dd');validatorNotToday",
                            "required": true,
                            "ctrlType": "date"
                        },
                        {
                            "property": "chgSTime",
                            "label": "Change Over Start Time",
                            "ctrlType": "time"
                        },
                        {
                            "property": "chgETime",
                            "label": "Change Over End Time",
                            "ctrlType": "time"
                        },
                        {
                            "property": "orgTypSrv",
                            "label": "Original Type",
                            "ctrlType": "select",
                            "listvalue": "LABEL",
                            "listkey": "VALUE",
                            "items": "this.dict",
                            "validator": "dataValidatorddi"
                        },
                        {
                            "property": "extTypSrv",
                            "label": "Existing Type",
                            "ctrlType": "select",
                            "listvalue": "LABEL",
                            "listkey": "VALUE",
                            "items": "this.dict",
                            "validator": "dataValidatorddi"
                        },
                        {
                            "property": "lalBw",
                            "label": "LAL/BW Order No.",
                            "validator": "number;maxlength(20)",
                            "ctrlType": "input"
                        },
                        {
                            "property": "cmt",
                            "label": "Comment",
                            "validator": "maxlength(200)",
                            "ctrlType": "textarea"
                        },
                        {
                            "property": "rno",
                            "label": "2N Operator",
                            "required": true,
                            "validator": "regExp('^([A-Z]{2})$')",
                            "ctrlType": "textarea"
                        }
                    ],
                    "attrs": {},
                    "metaId": "${gid}addnpainfo_0_",
                    "id": "npabasicInfo",
                    "metaGadget": "ds-object",
                    "property": "getAddRequest()",
                    "templateAttrs": {
                        "cols": "3"
                    },
                    "__metatype__": "object"
                }
            ],
            "attrs": {},
            "__metatype__": "panelcontainer",
            "metaId": "${gid}addnpainfo_",
            "contentclass": "hlds-is-nesting",
            "layout": {
                "type": "grid",
                "height": "auto",
                "size": "12",
                "items": [
                    "npabasicInfo"
                ]
            }
        },
        "addinfoActions": {
            "actions": [
                {
                    "label": "CANCEL",
                    "refBo": false,
                    "kind": "popin"
                },
                {
                    "name": "validateTime",
                    "label": "CONFIRM",
                    "validate": "#npabasicInfo",
                    "disable": "this.confirmDisable",
                    "type": "button-primary",
                    "refBo": false,
                    "triggers": [
                        {
                            "action": {
                                "kind": "popin",
                                "label": "Confirm",
                                "name": "confirm",
                                "refBo": false
                            },
                            "__metatype__": "trigger",
                            "condition": "SUCCESS"
                        }
                    ]
                }
            ],
            "__metatype__": "actions",
            "metaId": "${gid}addinfoActions_",
            "metaGadget": "ds-actions"
        }
    },
    "__metatype__": "gadget",
    "initActions": [
        {
            "name": "init",
            "label": "init",
            "refBo": false
        }
    ]
};


/***/ })

/******/ });