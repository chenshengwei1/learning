const util_1 = require("./util");

class Test
{
    constructor(params){
        if (params){
            this.params = params;
        }
    }
    run(targetDir, sourceDir, allEntity) {
        util_1.fsHelper.excludes('node_modules');
        util_1.fsHelper.excludes('target');
        this.count = 0;
        this.lastCount = 0;
        this.restfulSer = [];
        var suffixFilter = this.params.suffix || "bs.xml";
        util_1.fsHelper.mapXmlFiles(targetDir, sourceDir, suffixFilter, (xmlObject, fileName, srcFilepath) => {
            
            if (suffixFilter == 'rest.xml'){
                this.parseRestful(xmlObject, fileName, srcFilepath, allEntity)
            }else if (suffixFilter == 'bs.xml'){
                this.parseBS(xmlObject, fileName, srcFilepath, allEntity)
            }
            else if (suffixFilter == 'entity.xml'){
                this.parseEntity(xmlObject, fileName, srcFilepath, allEntity)
            }
            if (xmlObject) {
                try {
                    let entities = xmlObject["rests"] || {};
                    //util_1.fsHelper.mvn(srcFilepath);
                    this.prehandle(entities, allEntity, fileName, srcFilepath);
                    return this.generator(entities, fileName);
                }
                catch (error) {
                    throw error;
                }
            }
            else {
                return [];
            }
        }, pathObject => {
            return {
                name: pathObject.name,
                ext: `.entity.ts`,
                dir: ""
            };
        });

          
         
    }

    toTheEnd(){
        var intervalObj = setInterval(() => {
            console.log('interviewing the interval');
            if (this.count == this.lastCount) {

            }else{
                
            }
          }, 500);
        clearInterval(intervalObj);
    }

    parseRestful(xmlObject, fileName, srcFilepath, allEntity){
        if (xmlObject) {
            try {
                let entities = xmlObject["rests"] || {};
                //util_1.fsHelper.mvn(srcFilepath);
                this.prehandle(entities, allEntity, fileName, srcFilepath);
                return this.generator(entities, fileName);
            }
            catch (error) {
                throw error;
            }
        }
        else {
            return [];
        }
    }

    parseEntity(xmlObject, fileName, srcFilepath, allEntity){
        if (xmlObject) {
            try {
                let entities = xmlObject["entities"] || {};
                //util_1.fsHelper.mvn(srcFilepath);
                this.prehandleEntity(entities, allEntity, fileName, srcFilepath);
                return this.generator(entities, fileName);
            }
            catch (error) {
                throw error;
            }
        }
        else {
            return [];
        }
    }

    parseBS(xmlObject, fileName, srcFilepath, allEntity){
        if (xmlObject) {
            try {
                let entities = xmlObject["business-service"] || {};
                //util_1.fsHelper.mvn(srcFilepath);
                this.prehandleBS(entities, allEntity, fileName, srcFilepath);
                return this.generator(entities, fileName);
            }
            catch (error) {
                throw error;
            }
        }
        else {
            return [];
        }
    }

     /**
     * <entities xmlns="http://www.huawei.com/bdf">
  <entity name="OcApprovalInfo" package-name="com.huawei.bes.cpq.base.salesorder" table-name="OC_APPROVAL_INFO" display-name="授权信息">
      <field name="approvalId" type="number-long(20,0)" column-name="APPROVAL_ID" primary-key="true" required="true"  sequence-generator="snowflake" description="授权人标识"/>
    <field name="approvalComment" type="text(256)" column-name="APPROVAL_COMMENT" mask="logWarning" description="授权意见"/>
    <field name="approvalDate" type="date-time" column-name="APPROVAL_DATE" required="true" description="授权时间"/>
    <field name="applyObjectType" type="text(4)" column-name="APPLY_OBJECT_TYPE" description="授权对象类型"/>
    <field name="applyObjectId" type="number-long(20,0)" column-name="APPLY_OBJECT_ID" description="授权对象标识"/>
    <field name="approvalOperatorId" type="number-long(20,0)" column-name="APPROVAL_OPERATOR_ID" description="授权操作员标识"/>
    <field name="approvalType" type="text(8)" column-name="APPROVAL_TYPE" description="授权类型"/>
    <field name="beId" type="number-long(10,0)" column-name="BE_ID" required="true" description="运营实体标识"/>
    <index index-fields="approvalId;approvalDate;beId" name="IDX_OC_ORDER_APPROVAL" unique="true"/>
    <index index-fields="approvalId" name="PK_OC_ORDER_APPROVAL" unique="true"/>
    <index index-fields="applyObjectId;applyObjectType;beId" name="IDX_OC_APPROVAL_APPLYOBJ"/>
    <description><![CDATA[授权信息]]></description>
  </entity>
     * 
     * @param {*} entities 
     * @param {*} allEntity 
     * @param {*} fileName 
     * @param {*} srcFilepath 
     */
    prehandleEntity(entities, allEntity, fileName, srcFilepath) {
        //this.count++;
        console.log((++this.count) );
        var voEntities = [];
        voEntities = voEntities.concat(entities.entity || []);
        voEntities = voEntities.concat(entities['view-entity'] || []);
        voEntities = voEntities.concat(entities['query-entity'] || []);

        for (var oper of voEntities || []){
            this.asyncContruct('entity', oper);
            console.log(this.count + ' operator name：' +oper.$['package-name'] + '.'+oper.$.name);
            var service = {
                file:fileName,
                filepath:srcFilepath,
                path:oper.$['package-name'] + '.'+oper.$.name,
                field:[]
            }
            allEntity.push(service);

            var memberEntity = {};
            if (oper['member-entity']){
                for(var field of oper['member-entity'] || []){
                    this.asyncContruct('entity.member-entity', field);
                    if (field.$['entity-alias']){
                        memberEntity[field.$['entity-alias']] = field.$['entity-name'];
                    }
                }
            }

            if (oper.$.extends){
                var refEntityName = oper.$.extends;
                var refEntity = this.findEntity(allEntity, refEntityName, service);
                if (refEntity) {
                    for (var refField of refEntity.field){
                        service.field.push({
                            name:refField.name,
                            type:refField.type,
                            link:'entity:'+refEntityName+'#'+refField.name
                        })
                    }
                }else{
                    service.link = 'error:entity:'+refEntityName;
                }
            }

            if (oper['field']){
                for(var field of oper['field'] || []){
                    this.asyncContruct('entity.field', field);

                    if (field.$['entity-field']){
                        if (field.$['entity-alias']){
                            var refEntityName = memberEntity[field.$['entity-alias']];
                            var refEntity = this.findEntity(allEntity, refEntityName, service);
                            if (refEntity) {
                                for (var refField of refEntity.field){
                                    if (refField.name == field.$['entity-field']){
                                        service.field.push({
                                            name:field.$.name,
                                            type:refField.type,
                                            link:'entity:'+refEntityName+'#'+refField.name
                                        })
                                    }
                                }
                            }else{
                                service.field.push({
                                    name:field.$.name,
                                    type:refEntityName+'#'+field.$['entity-field'],
                                    link:'error:entity:'+refEntityName+'#'+field.$['entity-field']
                                })
                            }
                        }else{
                            console.log('Miss reference field in :' + 'entity:'+service.path+'#'+field.$['entity-field'] + ' to link ' + field.$['entity-alias']);
                        }
                    }else{
                        service.field.push({
                            name:field.$.name,
                            type:field.$.type
                        })
                    }
                }
            }
            if (oper['relationship']){
                for(var field of oper['relationship'] || []){
                    this.asyncContruct('entity.relationship', field);
                    service.field.push({
                        name:field.$.name,
                        type:field.$['related-entity'],
                        link:'entity:'+field.$['related-entity']
                    })
                }
            }

            

            if (oper['fields-all']){
                // <fields-all entity-name="com.huawei.bes.cpq.base.core.ResponseItem">
                for(var field of oper['fields-all'] || []){
                    this.asyncContruct('entity.fields-all', field);

                    var refEntityName = field.$['entity-name'] || memberEntity[field.$['entity-alias']];

                    var exclude = [];
                    for(var excl of field['exclude'] || []){
                        this.asyncContruct('entity.fields-all.exclude', excl);
                        exclude.push(excl.$['entity-field']);
                    }

                    var include = [];
                    for(var incl of field['include'] || []){
                        this.asyncContruct('entity.fields-all.include', incl);
                        include.push(incl.$['entity-field']);
                    }

                    var refEntity = this.findEntity(allEntity, refEntityName, service);
                    if (refEntity) {
                        for (var refField of refEntity.field){
                            if (include.length){
                                if (include.indexOf(refField.name) != -1){
                                    service.field.push({
                                        name:refField.name,
                                        type:refField.type,
                                        link:'entity:'+refEntityName+'#'+refField.name
                                    })
                                }
                            }else{
                                if (exclude.indexOf(refField.name) != -1){
                                    continue;
                                }
                                service.field.push({
                                    name:refField.name,
                                    type:refField.type,
                                    link:'entity:'+refEntityName+'#'+refField.name
                                })
                            }
                        }
                    }else{
                        service.field.push({
                            name:'reference:' + refEntityName,
                            type:refEntityName,
                            link:'error:entity:'+refEntityName
                        })
                    }

                }
            }
        }
        if(this.count == 2084){
            this.sendBS(allEntity);
        }
        if(this.count == 2084){
            console.log( ' xsd name：' +JSON.stringify(this.xsd));
        }
    }

    findEntity(allEntity, entityName, curEnity){
        for(var e of allEntity){
            if (curEnity == e){
                continue;
            }
            if (e.path == entityName){
                return e;
            }
        }
        return null;
    }

    /**
     * <business-service xmlns="http://www.huawei.com/bdf" name="com.huawei.bes.cpq.base_hkt.component.ValidatorBOService" display-name="校验服务">
  <transaction-manager transaction-manager-type="local"/>
  <operation name="validator" display-name="校验接口">
  	<in-parameters>
  		<parameter name="request"
  			type="entity:com.huawei.bes.cpq.base_hkt.component.ValidatorRequest">
  			<description>校验入参</description>
  		</parameter>
  	</in-parameters>
  	<out-parameter
  		type="entity:com.huawei.bes.cpq.base_hkt.component.ValidatorResponse">
  		<description></description>
  	</out-parameter>
  	<description><![CDATA[OCCPQ校验接口，提供校验和过滤能力]]></description>
  	<transaction propagation="required" />
  </operation>
  <implementation-bo bo-name="com.huawei.bes.cpq.base_hkt.component.ValidatorBO"/>
  <binding-rpc/>
  <binding-restful path="/bes/occore/ext/tele/validator/validatorboservice"/>
  <description><![CDATA[校验服务，提供统一校验接口]]></description>
</business-service>
     * 
     * @param {*} entities 
     * @param {*} allEntity 
     * @param {*} fileName 
     * @param {*} srcFilepath 
     */
    prehandleBS(entities, allEntity, fileName, srcFilepath) {
        //this.count++;
        console.log((this.count++) + ' operator name：' +entities.$.name);
        for (var oper of entities.operation || []){
            //console.log('operator name：' +JSON.stringify(oper));
            var service = {
                file:fileName,
                filepath:srcFilepath,
                path:entities.$.name + '#' + oper.$.name,
                inParameter:[]
            }
            allEntity.push(service);
            if (oper['in-parameters']){
                for(var inparam of oper['in-parameters'] || []){
                    for(var param of inparam.parameter || []){
                        service.inParameter.push({
                            name:param.$.name,
                            type:param.$.type
                        })
                    }
                }
            }
            if (oper['out-parameters']){
                for(var outparam of oper['out-parameters'] || []){
                    service.outParameter = {
                        name:outparam.$.name,
                        type:outparam.$.type
                    }
                }
            }
            if (entities['implementation-bo'] &&entities['implementation-bo'].$){
                service.implementationBO = entities['implementation-bo'].$['bo-name'];
            }
        }
        if(this.count == 472){
            this.sendBS(allEntity);
        }
    }

    prehandle(entities, allEntity, fileName, srcFilepath) {
        
        for (var ser of entities.service || []){
            //console.log('service name：' +ser.$.provider);
            if (!ser.$.provider){
                //console.log('service1 name：' +JSON.stringify(ser));
            }
            for (var oper of ser.operation || []){
                this.count++;
                //console.log((this.count++) + 'operator name：' +ser.$.path + oper.$.path);
                allEntity.push({
                    file:fileName,
                    filepath:srcFilepath,
                    path:ser.$.path + oper.$.path,
                    authid:oper.$.authid,
                    name:oper.$.name,
                    service:ser.$.provider,
                    params:(oper.param||[]).map(p=>{return p.$?p.$.param:''}).join(',')
                });
                if(this.count == 1250){
                    this.send(this.restfulSer);
                }
            }
        }
        //console.log('prehandle　fileName：' +JSON.stringify(entities));
        //console.log('prehandle　services：' +JSON.stringify(entities.service));
        /**
         * <?xml version="1.0" encoding="UTF-8"?>
<rests>
  <service path="/com/huawei/bes/apifabric/ext/hkt/noss/checkfaxemailboservice" provider="ebus:com.huawei.bes.apifabric.hkt.noss.CheckFaxEmailBOService">
    <operation path="/checkfaxemail" name="checkFaxEmail" http-method="post" authid="60135">
      <param param="checkfaxemailreq"/>
    </operation>
  </service>
</rests>
         */
        
    }

    send(result){
        //console.log('prehandle　services：' +JSON.stringify(result));

        util_1.fsHelper.writeWithPromise(this.params.target + '/bs.json', JSON.stringify(result));
    }

    sendBS(result){
        //console.log('prehandle　services：' +JSON.stringify(result));

        util_1.fsHelper.writeWithPromise(this.params.target + '/' + this.params.outputfile, JSON.stringify(result));
    }

    generator(entities, fileName){

    }

    asyncContruct(type, entityObj){
        for (var key in entityObj){
            this.xsd = this.xsd || {};
            this.xsd[type] = this.xsd[type]||[];
            if (key == '$'){
                for (var key2 in entityObj['$']){
                    if (this.xsd[type].indexOf(key2) == -1){
                        this.xsd[type].push(key2);
                    }
                }
                continue;
            }
            if (this.xsd[type].indexOf(key) == -1){
                this.xsd[type].push(key);
            }
        }
    }

}
var path1 = 'D:\\work\\storage\\BESUnifiedSystemManagementCTZ_S17\\sm\\com.huawei.bes.sm.base_sm\\com.huawei.bes.sm.base_sm.component.web';
var path4 = 'D:\\work\\storage\\BESAPIFabricCTZ_S17\\hktBillingAdapter\\foundation\\com.huawei.bes.apifabric.hkt.cbs';
var basePath = 'D:\\gitlab-maven-respository\\com\\huawei';
var path2 = 'D:/work/storage';
var target = 'D:/work/testnpm/target';
var outputfile = 'base.entity.json';
var suffix = 'entity.xml';
new Test({target: target, outputfile: outputfile, suffix:suffix}).run('D:/work/testnpm/target', basePath,[])