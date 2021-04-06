/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable no-useless-escape */
/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/naming-convention */
/**
 * html2Json 改造来自: https://github.com/Jxck/html2json
 *
 *
 */

import { strDiscode, urlToHttpUrl } from './discode';
import HTMLParser from './htmlparser';

const __placeImgeUrlHttps = 'https';
let __emojisReg = '';
let __emojisBaseSrc = '';
let __emojis = {};

function makeMap(str) {
    const obj = {},
        items = str.split(',');
    for (let i = 0; i < items.length; i++) obj[items[i]] = true;
    return obj;
}

// Empty Elements - HTML 5
const empty = makeMap('area,base,basefont,br,col,frame,hr,img,input,link,meta,param,embed,command,keygen,source,track,wbr');
// Block Elements - HTML 5
const block = makeMap(
    'br,a,code,address,article,applet,aside,audio,blockquote,button,canvas,center,dd,del,dir,div,dl,dt,fieldset,figcaption,figure,footer,form,frameset,h1,h2,h3,h4,h5,h6,header,hgroup,hr,iframe,ins,isindex,li,map,menu,noframes,noscript,object,ol,output,p,pre,section,script,table,tbody,td,tfoot,th,thead,tr,ul,video'
);

// Inline Elements - HTML 5
const inline = makeMap(
    'abbr,acronym,applet,b,basefont,bdo,big,button,cite,del,dfn,em,font,i,iframe,img,input,ins,kbd,label,map,object,q,s,samp,script,select,small,span,strike,strong,sub,sup,textarea,tt,u,var'
);

// Elements that you can, intentionally, leave open
// (and which close themselves)
const closeSelf = makeMap('colgroup,dd,dt,li,options,p,td,tfoot,th,thead,tr');

// Attributes that have their values filled in disabled="disabled"
const fillAttrs = makeMap('checked,compact,declare,defer,disabled,ismap,multiple,nohref,noresize,noshade,nowrap,readonly,selected');

// Special Elements (can contain anything)
const special = makeMap('wxxxcode-style,script,style,view,scroll-view,block');

function q(v) {
    return `"${v}"`;
}

function removeDOCTYPE(html) {
    return html
        .replace(/<\?xml.*\?>\n/, '')
        .replace(/<.*!doctype.*\>\n/, '')
        .replace(/<.*!DOCTYPE.*\>\n/, '');
}

function trimHtml(html) {
    return html.replace(/<!--.*?-->/gi, '').replace(/[ ]+</gi, '<');
}

/**
 * 过滤掉小程序无法展示的标签
 * @param {*} html
 */
function removeInvalidTags(html) {
    return html
        .replace(/\<head(.|\n)*<\/head\>/gi, '')
        .replace(/\<title(.|\n)*<\/title\>/gi, '')
        .replace(/\<script(.|\n)*<\/script\>/gi, '')
        .replace(/\<meta(.|\n)*<\/meta\>/gi, '')
        .replace(/\<style(.|\n)*<\/style\>/gm, '');
}

export function html2json(html, bindName?) {
    // 处理字符串
    html = removeDOCTYPE(html);
    html = removeInvalidTags(html);
    html = trimHtml(html);
    html = strDiscode(html);
    // 生成node节点
    const bufArray: any = [];
    const results: any = {
        node: bindName,
        nodes: [],
        images: [],
        imageUrls: [],
    };
    let index = 0;
    HTMLParser(html, {
        start(tag, attrs, unary, content) {
            // debug(tag, attrs, unary);
            // node for this element
            const node: any = {
                node: 'element',
                tag,
            };
            // 判断是否需要添加标签主体内容
            content && (node.content = content);

            if (bufArray.length === 0) {
                node.index = index.toString();
                index += 1;
            } else {
                const parent: any = bufArray[0];
                if (parent.nodes === undefined) {
                    parent.nodes = [];
                }
                node.index = `${parent.index}.${parent.nodes.length}`;
            }

            if (block[tag]) {
                node.tagType = 'block';
            } else if (inline[tag]) {
                node.tagType = 'inline';
            } else if (closeSelf[tag]) {
                node.tagType = 'closeSelf';
            }

            if (attrs.length !== 0) {
                node.attr = attrs.reduce(function (pre, attr) {
                    const { name } = attr;
                    let { value } = attr;
                    if (name === 'id') {
                        // console.dir(value);
                        //  value = value.join("")
                        node.id = value;
                    }
                    if (name === 'value') {
                        // console.dir(value);
                        //  value = value.join("")
                        node.value = value;
                    }
                    if (name === 'class') {
                        // console.dir(value);
                        //  value = value.join("")
                        node.classStr = value;
                    }
                    // has multi attibutes
                    // make it array of attribute
                    if (name === 'style') {
                        // console.dir(value);
                        //  value = value.join("")
                        node.styleStr = value;
                    }
                    if (value.match(/ /)) {
                        value = value.split(' ');
                    }

                    // if attr already exists
                    // merge it
                    if (pre[name]) {
                        if (Array.isArray(pre[name])) {
                            // already array, push to last
                            pre[name].push(value);
                        } else {
                            // single value, make it array
                            pre[name] = [pre[name], value];
                        }
                    } else {
                        // not exist, put it
                        pre[name] = value;
                    }

                    return pre;
                }, {});
            }

            // 对img添加额外数据
            if (node.tag === 'img') {
                node.imgIndex = results.images.length;
                let imgUrl = node.attr.src;
                if (imgUrl[0] === '') {
                    imgUrl.splice(0, 1);
                }
                imgUrl = urlToHttpUrl(imgUrl, __placeImgeUrlHttps);
                node.attr.src = imgUrl;
                node.from = bindName;
                results.images.push(node);
                results.imageUrls.push(imgUrl);
            }

            // 处理font标签样式属性
            if (node.tag === 'font') {
                const fontSize = ['x-small', 'small', 'medium', 'large', 'x-large', 'xx-large', '-webkit-xxx-large'];
                const styleAttrs = {
                    color: 'color',
                    face: 'font-family',
                    size: 'font-size',
                };
                if (!node.attr.style) node.attr.style = [];
                if (!node.styleStr) node.styleStr = '';
                Object.keys(styleAttrs).forEach((key) => {
                    if (node.attr[key]) {
                        const value = key === 'size' ? fontSize[node.attr[key] - 1] : node.attr[key];
                        node.attr.style.push(styleAttrs[key]);
                        node.attr.style.push(value);
                        node.styleStr += `${styleAttrs[key]}: ${value};`;
                    }
                });
            }

            // 临时记录source资源
            if (node.tag === 'source') {
                results.source = node.attr.src;
            }

            if (unary) {
                // if this tag doesn't have end tag
                // like <img src="hoge.png"/>
                // add to parents
                const parent: any = bufArray[0] || results;
                if (parent.nodes === undefined) {
                    parent.nodes = [];
                }
                parent.nodes.push(node);
            } else {
                bufArray.unshift(node);
            }
        },
        end(tag) {
            // debug(tag);
            // merge into parent tag
            const node = bufArray.shift();
            if (node.tag !== tag) console.error('invalid state: mismatch end tag');

            // 当有缓存source资源时于于video补上src资源
            if (node.tag === 'video' && results.source) {
                node.attr.src = results.source;
                delete results.source;
            }

            if (bufArray.length === 0) {
                results.nodes.push(node);
            } else {
                const parent = bufArray[0];
                if (parent.nodes === undefined) {
                    parent.nodes = [];
                }
                parent.nodes.push(node);
            }
        },
        chars(text) {
            // debug(text);
            const node: any = {
                node: 'text',
                text,
                textArray: transEmojiStr(text),
            };

            if (bufArray.length === 0) {
                node.index = index.toString();
                index += 1;
                results.nodes.push(node);
            } else {
                const parent = bufArray[0];
                if (parent.nodes === undefined) {
                    parent.nodes = [];
                }
                node.index = `${parent.index}.${parent.nodes.length}`;
                parent.nodes.push(node);
            }
        },
        comment(text) {
            // debug(text);
            // var node = {
            //     node: 'comment',
            //     text: text,
            // };
            // var parent = bufArray[0];
            // if (parent.nodes === undefined) {
            //     parent.nodes = [];
            // }
            // parent.nodes.push(node);
        },
    });
    return results;
}

function transEmojiStr(str) {
    // var eReg = new RegExp("["+__reg+' '+"]");
    //   str = str.replace(/\[([^\[\]]+)\]/g,':$1:')

    const emojiObjs: any[] = [];
    // 如果正则表达式为空
    if (__emojisReg.length === 0 || !__emojis) {
        const emojiObj: any = {};
        emojiObj.node = 'text';
        emojiObj.text = str;
        const array = [emojiObj];
        return array;
    }
    // 这个地方需要调整
    str = str.replace(/\[([^\[\]]+)\]/g, ':$1:');
    const eReg = new RegExp('[:]');
    const array = str.split(eReg);
    for (let i = 0; i < array.length; i++) {
        const ele = array[i];
        const emojiObj: any = {};
        if (__emojis[ele]) {
            emojiObj.node = 'element';
            emojiObj.tag = 'emoji';
            emojiObj.text = __emojis[ele];
            emojiObj.baseSrc = __emojisBaseSrc;
        } else {
            emojiObj.node = 'text';
            emojiObj.text = ele;
        }
        emojiObjs.push(emojiObj);
    }
    return emojiObjs;
}

export function emojisInit(reg = '', baseSrc = '/htmlParse/emojis/', emojis) {
    __emojisReg = reg;
    __emojisBaseSrc = baseSrc;
    __emojis = emojis;
}
