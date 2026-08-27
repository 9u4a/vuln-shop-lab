package com.vulnlab.shop.vuln;

import org.apache.commons.text.StringSubstitutor;

/**
 * Merge-field rendering for announcement / FAQ bodies.
 * Isolated here so the interpolation call site is contained to one class.
 */
public final class TemplateRenderer {

    private TemplateRenderer() {}

    public static String render(String text) {
        if (text == null || text.indexOf("${") < 0) {
            return text;
        }
        return StringSubstitutor.createInterpolator().replace(text);
    }
}
