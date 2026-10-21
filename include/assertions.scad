// Named values keep assertion failures useful without changing native assert().
function assertion_message(message, values) =
    len(values) == 0 ? message :
    str(message, " Values: ", _assertion_join([
        for (setting = values)
            str(setting[0], "=", _assertion_value(setting[1]))
    ]), ".");

function _assertion_join(parts, index = 0) =
    index >= len(parts) ? "" :
    str(index == 0 ? "" : ", ", parts[index], _assertion_join(parts, index + 1));

function _assertion_value(value) =
    is_string(value) ? str("\"", _assertion_escape(value), "\"") :
    is_list(value) ? str("[", _assertion_join([
        for (item = value) _assertion_value(item)
    ]), "]") : str(value);

function _assertion_escape(value, index = 0) =
    index >= len(value) ? "" :
    str(value[index] == "\\" ? "\\\\" :
        value[index] == "\"" ? "\\\"" :
        value[index] == "\n" ? "\\n" :
        value[index] == "\r" ? "\\r" :
        value[index] == "\t" ? "\\t" : value[index],
        _assertion_escape(value, index + 1));
