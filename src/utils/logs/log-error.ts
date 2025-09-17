import { Ora } from "ora";



export function logError(log: Ora, error: unknown, type: "fail" | "warn" = "fail") {
    const errorStr = error instanceof Error ? error.message : String(error);

    return (strings: TemplateStringsArray, ...values: unknown[]) => {
        const msg = strings.reduce((out, str, i) => {
            let val = "";
            if (i < values.length) {
                // if the interpolated value is the *same object* as error
                if (values[i] === error) {
                    val = errorStr;
                } else {
                    val = String(values[i]);
                }
            }
            return out + str + val;
        }, "");

        switch (type) {
            case "fail": log.fail(msg); break;
            case "warn": log.warn(msg); break;
        }


    }
}