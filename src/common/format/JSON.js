﻿import SuperMap from '../SuperMap';
import Format from './Format';
/**
 * @class SuperMap.Format.JSON
 * @description 安全的读写JSON的解析类。使用<SuperMap.Format.JSON> 构造函数创建新实例。
 * @augments SuperMap.Format
 * @param options - {Object} 选项对象，其属性会被直接设置到JSON实例。
 */
export default  class JSONFormat extends Format {

    /**
     * @member SuperMap.Format.JSON.prototype.indent -{String}
     * @description 用于格式化输出，indent字符串会在每次缩进的时候使用一次；
     */
    indent = "    ";

    /**
     * @member SuperMap.Format.JSON.prototype.space -{String}
     * @description 用于格式化输出，space字符串会在名值对的":"后边添加。
     */
    space = " ";

    /**
     * @member SuperMap.Format.JSON.prototype.newline -{String}
     * @description 用于格式化输出, newline字符串会用在每一个名值对或数组项末尾。
     */
    newline = "\n";

    /**
     * @member SuperMap.Format.JSON.prototype.level -{Integer}
     * @description 用于格式化输出, 表示的是缩进级别。
     */
    level = 0;

    /**
     * @member SuperMap.Format.JSON.prototype.pretty -{Boolean}
     * @description 是否在序列化的时候使用额外的空格控制结构。在 <write> 方法中使用
     *              默认值为false。
     */
    pretty = false;

    /**
     * @member SuperMap.Format.JSON.prototype.nativeJSON -{Boolean}
     * @description 判断浏览器是否原生支持JSON格式数据；
     */
    nativeJSON = (function () {
        return !!(window.JSON && typeof JSON.parse === "function" && typeof JSON.stringify === "function");
    })();

    /*
     * Constructor: SuperMap.Format.JSON
     * 创建一个新的JSON解析器。
     *
     * Parameters:
     * options - {Object} 选项对象，其属性会被直接设置到JSON实例。
     */

    /**
     * @function SuperMap.Format.JSON.prototype.read
     * @description 将一个符合json结构的字符串进行解析。
     *
     * Parameters:
     * json - {String} 符合json结构的字符串。
     * filter - {Function} 过滤方法，最终结果的每一个键值对都会调用该过滤方法，
     * 并在对应的值的位置替换成该方法返回的值。
     *
     * Returns:
     * {Object} 对象，数组，字符串或数字。
     */
    read(json, filter) {
        var object;
        if (this.nativeJSON) {
            try {
                object = JSON.parse(json, filter);
            }
            catch (e) {
                // Fall through if the regexp test fails.
            }
        }

        if (this.keepData) {
            this.data = object;
        }

        return object;
    }

    /**
     * @function SuperMap.Format.JSON.prototype.write
     * @description 序列化一个对象到一个符合JSON格式的字符串。
     * @param value - {String} 需要被序列化的对象，数组，字符串，数字，布尔值。
     * @return {String} 符合JSON格式的字符串。
     */
    write(value, pretty) {
        this.pretty = !!pretty;
        var json = null;
        var type = typeof value;
        if (this.serialize[type]) {
            try {
                json = (!this.pretty && this.nativeJSON) ?
                    JSON.stringify(value) :
                    this.serialize[type].apply(this, [value]);
            } catch (err) {
                //SuperMap.Console.error("Trouble serializing: " + err);
            }
        }
        return json;
    }

    /**
     * @function SuperMap.Format.JSON.prototype.writeIndent
     * @description 根据缩进级别输出一个缩进字符串。
     * @return {String} 一个适当的缩进字符串。
     */
    writeIndent() {
        var pieces = [];
        if (this.pretty) {
            for (var i = 0; i < this.level; ++i) {
                pieces.push(this.indent);
            }
        }
        return pieces.join('');
    }

    /**
     * @function SuperMap.Format.JSON.prototype.writeNewline
     * @description 在格式化输出模式情况下输出代表新一行的字符串。
     * @return {String} 代表新的一行的字符串。
     */
    writeNewline() {
        return (this.pretty) ? this.newline : '';
    }

    /**
     * @function SuperMap.Format.JSON.prototype.writeSpace
     * @description 在格式化输出模式情况下输出一个代表空格的字符串。
     * @return {String} A space.
     */
    writeSpace() {
        return (this.pretty) ? this.space : '';
    }

    /**
     * @member SuperMap.Format.JSON.prototype.serialize
     * @description Object with properties corresponding to the serializable data types.
     *              Property values are functions that do the actual serializing.
     */
    serialize = {
        /**
         * @method SuperMap.Format.JSON.serialize.object
         * @description Transform an object into a JSON string.
         * @param object - {Object} The object to be serialized.
         * @return {String} A JSON string representing the object.
         */
        'object': function (object) {
            // three special objects that we want to treat differently
            if (object == null) {
                return "null";
            }
            if (object.constructor === Date) {
                return this.serialize.date.apply(this, [object]);
            }
            if (object.constructor === Array) {
                return this.serialize.array.apply(this, [object]);
            }
            var pieces = ['{'];
            this.level += 1;
            var key, keyJSON, valueJSON;

            var addComma = false;
            for (key in object) {
                if (object.hasOwnProperty(key)) {
                    // recursive calls need to allow for sub-classing
                    keyJSON = SuperMap.Format.JSON.prototype.write.apply(this,
                        [key, this.pretty]);
                    valueJSON = SuperMap.Format.JSON.prototype.write.apply(this,
                        [object[key], this.pretty]);
                    if (keyJSON != null && valueJSON != null) {
                        if (addComma) {
                            pieces.push(',');
                        }
                        pieces.push(this.writeNewline(), this.writeIndent(),
                            keyJSON, ':', this.writeSpace(), valueJSON);
                        addComma = true;
                    }
                }
            }

            this.level -= 1;
            pieces.push(this.writeNewline(), this.writeIndent(), '}');
            return pieces.join('');
        },

        /**
         * @method SuperMap.Format.JSON.serialize.array
         * @description Transform an array into a JSON string.
         * @param array - {Array} The array to be serialized
         * @return {String} A JSON string representing the array.
         */
        'array': function (array) {
            var json;
            var pieces = ['['];
            this.level += 1;

            for (var i = 0, len = array.length; i < len; ++i) {
                // recursive calls need to allow for sub-classing
                json = SuperMap.Format.JSON.prototype.write.apply(this,
                    [array[i], this.pretty]);
                if (json != null) {
                    if (i > 0) {
                        pieces.push(',');
                    }
                    pieces.push(this.writeNewline(), this.writeIndent(), json);
                }
            }

            this.level -= 1;
            pieces.push(this.writeNewline(), this.writeIndent(), ']');
            return pieces.join('');
        },

        /**
         * @method SuperMap.Format.JSON.serialize.string
         * @description Transform a string into a JSON string.
         * @param string - {String} The string to be serialized
         * @return {String} A JSON string representing the string.
         */
        'string': function (string) {
            // If the string contains no control characters, no quote characters, and no
            // backslash characters, then we can simply slap some quotes around it.
            // Otherwise we must also replace the offending characters with safe
            // sequences.
            var m = {
                '\b': '\\b',
                '\t': '\\t',
                '\n': '\\n',
                '\f': '\\f',
                '\r': '\\r',
                '"': '\\"',
                '\\': '\\\\'
            };
            if (/["\\\x00-\x1f]/.test(string)) {
                return '"' + string.replace(/([\x00-\x1f\\"])/g, function (a, b) {
                        var c = m[b];
                        if (c) {
                            return c;
                        }
                        c = b.charCodeAt();
                        return '\\u00' +
                            Math.floor(c / 16).toString(16) +
                            (c % 16).toString(16);
                    }) + '"';
            }
            return '"' + string + '"';
        },

        /**
         * @method SuperMap.Format.JSON.serialize.number
         * @description Transform a number into a JSON string.
         * @param number - {Number} The number to be serialized.
         * @return {String} A JSON string representing the number.
         */
        'number': function (number) {
            return isFinite(number) ? String(number) : "null";
        },

        /**
         * @method SuperMap.Format.JSON.serialize.boolean
         * @description Transform a boolean into a JSON string.
         * @param bool - {Boolean} The boolean to be serialized.
         * @return {String} A JSON string representing the boolean.
         */
        'boolean': function (bool) {
            return String(bool);
        },

        /**
         * @method SuperMap.Format.JSON.serialize.object
         * @description Transform a date into a JSON string.
         * @param date - {Date} The date to be serialized.
         * @return {String} A JSON string representing the date.
         */
        'date': function (date) {
            function format(number) {
                // Format integers to have at least two digits.
                return (number < 10) ? '0' + number : number;
            }

            return '"' + date.getFullYear() + '-' +
                format(date.getMonth() + 1) + '-' +
                format(date.getDate()) + 'T' +
                format(date.getHours()) + ':' +
                format(date.getMinutes()) + ':' +
                format(date.getSeconds()) + '"';
        }
    };

    CLASS_NAME = "SuperMap.Format.JSON"
}

SuperMap.Format.JSON = JSONFormat;