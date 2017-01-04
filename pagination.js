     /**
     * 将json变为uri参数
     * @param  {[type]} json [description]
     * @return {[type]}      [description]
     */
    $.encodeURIJson = function (json){
        var s = [];
        for( var p in json ){
            // 删除掉参数, $.param 则是返回空， 如：
            // var a = {a: undefined, b: 1, c: null} -> a=&b=1&c=
            if(json[p]==null) {
                continue;
            }
            if(json[p] instanceof Array) {
                for (var i=0;i<json[p].length;i++) {
                    s.push( encodeURIComponent(p) + '=' + encodeURIComponent(json[p][i]));
                }
            } else {
                s.push( (p) + '=' + encodeURIComponent(json[p]));
            }
        }
        return s.join('&');
    };
     /**
     * 解析uri里的参数
     * @param  {[type]} url [description]
     * @param  {[type]} key [description]
     * @return {[type]}     [description]
     */
    $.queryUrl = function (url, key) {
        url = url.replace(/^[^?=]*\?/ig, '').split('#')[0]; //去除网址与hash信息
        var json = {};
        //考虑到key中可能有特殊符号如“[].”等，而[]却有是否被编码的可能，所以，牺牲效率以求严谨，就算传了key参数，也是全部解析url。
        url.replace(/(^|&)([^&=]+)=([^&]*)/g, function (a, b, key , value){
            //对url这样不可信的内容进行decode，可能会抛异常，try一下；另外为了得到最合适的结果，这里要分别try
            try {
            key = decodeURIComponent(key);
            } catch(e) {}

            try {
            value = decodeURIComponent(value);
            } catch(e) {}

            if (!(key in json)) {
                json[key] = /\[\]$/.test(key) ? [value] : value; //如果参数名以[]结尾，则当作数组
            }
            else if (json[key] instanceof Array) {
                json[key].push(value);
            }
            else {
                json[key] = [json[key], value];
            }
        });
        return key ? json[key] : json;
    };

    $.getUrlPath = function(){
        var url = location.protocol + "//"+location.hostname;
        if (location.port!="80") {
            url+= ":"+location.port;
        }
        url += location.pathname;
        return url;
    };
    /**
     * 修改URL的hash
     * @param  {[type]} json [description]
     * @return {[type]}      [description]
     */
    $.changeHash = function(json, replace) {
        json = json || {};
        var hash = (location.hash || "#").substr(1);
        var obj = $.queryUrl(hash);

        if(replace){
            obj = {};
        }

        obj = $.extend(obj, json);
        hash = $.encodeURIJson(obj);

        $(location).trigger('hashChanged',[json, obj]);

        location.hash = hash;

        return obj;
    };

     /**
     * 基于配置的事件代理
     * @param  {[type]} configs [description]
     * @return {[type]}         [description]
     */
    $.fn.delegates = function(configs){
        var el = $(this[0]);
        for(var name in configs){
            var value = configs[name];
            if (typeof value == 'function') {
                var obj = {};
                obj.click = value;
                value = obj;
            }
            for(var type in value){
                if( type == 'click' ) {
                    // 1. 第二次需要完全阻止 - 默认和冒泡 - 自定义列浮层奇葩问题
                    // 2. 复制元素 复制了 data-double-click属性 - 策略详情点8点7再点8无效
                    // 连续点击问题, 闭包
                    el.delegate(name, type, (function(fn, name){
                        return function(evt){
                            var me = $(this);
                            if( me.data('double-click') == '1' ) {
                                // 阻止默认和冒泡
                                return false;
                            }
                            // 延时设置 解决绑定多个click事件问题
                            setTimeout(function(){
                                me.data('double-click', 1);
                            }, 10);

                            // 500ms 后更改状态
                            var btnRet = setTimeout(function(){
                                me.data('double-click', 0);
                            }, 500);

                            var ret = fn.call(this, evt);

                            // 网络请求 返回promise, 保证网络请求ok 后更改按钮状态
                            // $.when(a)可以把任意参数作为 resolved Deferred
                            if( ret && $.isFunction(ret.always) ) {

                                clearTimeout(btnRet);
                                ret.always(function(){
                                    me.data('double-click', 0);
                                });
                            }
                        }
                    })( value[type], name) );

                } else {
                    el.delegate(name, type, value[type]);
                }
            }
        }
        return this;
    };
    /**
     * 动态创建一个类
     * @return {[type]} [description]
     */
    $.Class = function (prop) {    
        var cls = function () {        
            function T(args) {            
                return this.init.apply(this, args);        
            }        
            var _t = arguments.callee,
                init = _t.prototype.init;
            T.prototype = _t.prototype; 
            T.prototype.init = function () {            
                var args = arguments;          
                if (args.length === 1 && args[0] instanceof _t) {                
                    return this;             
                }
                init && init.apply(this, args);             
                return this;        
            };            
            T.constructor = _t;            
            return new T(arguments);     
        };        
        cls.extend = $.Class.extend;
        if (typeof prop == 'function') {
            prop = prop();
        }
        prop = prop || {};
        for(var name in prop){
            cls.prototype[name] = prop[name];
        }
        return cls;
    };
    /**
     * 类继承
     * @param  {[type]} prop [description]
     * @return {[type]}      [description]
     */
    $.Class.extend = function (prop){
        if (typeof prop == 'function') {
            prop = prop();
        }
        var _super = this.prototype;
        // Instantiate a base Class (but only create the instance,
        // don't run the init constructor)
        var prototype = $.extend({}, _super);
        for (var name in prop) {
            if(typeof prop[name] == "function" && typeof _super[name] == "function"){
                prototype[name] = (function (name, fn) {
                    return function () {
                        var tmp = this._super;
                        this._super = _super[name];
                        var ret = fn.apply(this, arguments);
                        this._super = tmp;
                        return ret;
                    };
                })(name, prop[name]);
            }
            else{
                prototype[name] = prop[name];
            }
        }
        var Class = pp.Class(prototype);
        return Class;
    };



    
  /**
     * 分页插件
     * @return {[type]} [description]
     */
    $.pager = $.Class(function(){
        // url跳转
        function getUrl(page, isAllSelected){
            var pars = $.queryUrl(location.href);
            pars.page = page;
            delete pars.clearall;

            // 是否去掉全选所有页
            if( isAllSelected ) {
                pars.rem = 1;
            } else {
                delete pars.rem;   // 全选所有页
            }
            pars = $.encodeURIJson(pars);
            url = $.getUrlPath() + "?"+pars;
            return url;
        }

        return {
            init: function(el, totalPage, currentPage, callback, totalNum){
                var self = this;

                self.el = $(el);
                self.totalPage = totalPage;
                // 没有currentPage
                if ( $.isFunction(currentPage) ) {
                    totalNum = callback;
                    callback = currentPage;
                    currentPage = '';
                }
                // 没有callback
                if( !$.isFunction(callback) ) {
                    totalNum = callback;
                    callback = null;
                }
                self.currentPage = currentPage;
                self.callback = callback;
                self.totalNum = totalNum;
            },
            getHtml: function(){
                var self = this;

                var page = 1;
                // 回调模式 和  刷新模式
                var pars = self.callback ? $.changeHash() : $.queryUrl(location.href);
                // currentPage 覆盖url中得page
                page = self.currentPage ? self.currentPage: (pars.page || 1);
                page = parseInt(page, 10) || 1;

                var html = [];
                // totalNum 为全局的变量
                var tmpTotal = self.callback ? (self.totalNum || 0) : (self.totalNum || totalNum);
                html.push ("<span class='total-record' >共"+tmpTotal+"条记录</span>");

                // 后续有隐藏元素操作
                self.el.css('display', 'inline-block');

                // 删除最后一页 跳转到最后一页
                if (page > self.totalPage && self.totalPage > 0) {
                    page = self.totalPage;
                    // 回调模式 直接 changeHash -> ok
                    if( self.callback ) {
                        $.changeHash({page: page});
                        // 重新获得数据
                        self.callback(page);
                    } else {
                        location.href = getUrl(page);
                    }
                }
                if (self.totalPage <= 1) {
                    self.el.css({ 'padding-right': '3px', 'margin': '0', 'height': 'auto' });
                    if( tmpTotal == 0 ) {
                        self.el.hide();
                        return;
                    } else {
                        return "<span class='total-record' >共<b style='color: #0a0; padding: 0 2px;'>"
                            + tmpTotal+"</b>条记录</span>";
                    }
                }

                if (page > 1) {
                    html.push('<a data-page="'+(page - 1)+'" href="'+getUrl(page - 1)+'" class="prev">上一页</a>');
                }
                var num = 3;
                var pageIndex = [];
                for(var i = page - num; i <= page + num; i++){
                    if (i >= 1 && i <= self.totalPage) {
                        pageIndex.push(i);
                    }
                }
                if (pageIndex[0] > 1) {
                    html.push('<a data-page="1" href="'+getUrl(1)+'">1</a>')
                }
                if (pageIndex[0] > 2) {
                    html.push('<span>…</span>');
                }
                for(var i=0,length=pageIndex.length;i<length;i++){
                    var p = pageIndex[i];
                    if (p == page) {
                        html.push('<a href="###" class="current">'+p+'</a>');
                    }else{
                        html.push('<a data-page="'+p+'" href="'+getUrl(p)+'">'+p+'</a>');
                    }
                }
                if (pageIndex.length > 1) {
                    var last = pageIndex[pageIndex.length - 1];
                    if (last < (self.totalPage - 1)) {
                        html.push('<span>…</span>');
                    }
                    if (last < self.totalPage) {
                        html.push('<a data-page="'+(self.totalPage)+'" href="'+getUrl(self.totalPage)+'">'+self.totalPage+'</a>')
                    }
                }
                html.push('<input type="text" class="pagination-num" />');

                html.push('<a target="" class="jump" href="#">跳转</a>');
                if (page < self.totalPage) {
                    html.push('<a data-page="'+(page+1)+'" href="'+getUrl(page + 1)+'" class="next">下一页</a>')
                }

                html = html.join(' ');
                return html;
            },
            // hashchange
            initData: function(){
                var self = this;
                self.getHtml();
            },
            run: function(){
                var self = this;
                self.bindEvent();
                self.el.html(self.getHtml());
            },
            isAllSelected: function(){
                // 关联的选择组件 - 是否全选所有页
                var relElem = $(this.el.data('rel-elem'));
                return relElem.attr('allpage') == 1;
            },
            bindEvent: function(){
                var self = this;
                if(self.el.attr('event-bind')){
                    return true;
                }
                self.el.attr('event-bind', 1);
                var selInst = $(self.el.data('rel-elem')).data('self');
                self.el.undelegate();
                self.el.delegates({
                    '.pagination-num': {
                        'keypress': function(e){
                            if (e.keyCode == 13) {
                                setTimeout(function(){
                                    self.el.find('a.jump').trigger("click");
                                }, 50);
                            };
                        }
                    },
                    'a.jump': function(event){
                        event.preventDefault();
                        var pageNum = self.el.find(".pagination-num");
                        var value = parseInt(pageNum.val(), 10);
                        if(!value) {
                            pageNum.val('').focus();
                            return;
                        } else if( value <= 0 ) {
                            $.tips('请输入有效的页码');
                            pageNum.val('').focus();
                            return;
                        } else if( value >= self.totalPage) {
                            value = self.totalPage;
                        }
                        if( self.callback ) {
                            $.changeHash({page: value});
                            self.currentPage = value;
                            self.el.html(self.getHtml());
                            // 异步全选所有页 - 问题callback后生成元素 未选中
                            self.callback(value);
                            // .done(function(){
                            //     // 全选 或者 取消全选
                            //     if( selInst ) {
                            //         selInst.isCheckAll() ? selInst.checkedAll() : selInst.clearCheck();
                            //     }
                            // });
                        } else {
                            location.href = getUrl(value, self.isAllSelected());
                        }
                    },
                    'a': function(event){
                        var me = $(this);
                        if( me.hasClass('current') || me.hasClass('jump') ) {
                            event.preventDefault();
                            return true;
                        }

                        if (self.callback) {    // 异步加载
                            event.preventDefault();
                            var page = me.data('page');

                            self.currentPage = page;
                            self.el.html(self.getHtml());

                            $.changeHash({page: page});
                            // 异步全选所有页 - 问题callback后生成元素 未选中
                            self.callback(page);
                            // .done(function(data){
                            //     if( selInst ) {
                            //         selInst.isCheckAll() ? selInst.checkedAll() : selInst.clearCheck();
                            //     }
                            // });
                            return true;
                        } else {                // 刷新页面 - 默认
                            // 全选所有页时 分页增加参数rem=1
                            if( self.isAllSelected() ) {
                                event.preventDefault();
                                location.href = $(this).attr('href') + '&rem=1';
                            }
                        }
                    }
                });
            }
        }
    });