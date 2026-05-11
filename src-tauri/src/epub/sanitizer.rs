pub fn sanitize_xhtml(input: &str) -> String {
    let mut output = input.to_string();
    for element in ["script", "iframe", "object", "embed", "link", "meta"] {
        output = strip_element(&output, element);
    }
    output = strip_event_handlers(&output);
    strip_dangerous_url_values(&output)
}

fn strip_element(input: &str, element: &str) -> String {
    let mut output = String::with_capacity(input.len());
    let mut cursor = 0;
    let lower = input.to_ascii_lowercase();
    let open = format!("<{element}");
    let close = format!("</{element}>");

    while let Some(start) = lower[cursor..].find(&open) {
        let absolute_start = cursor + start;
        output.push_str(&input[cursor..absolute_start]);
        if let Some(end) = lower[absolute_start..].find(&close) {
            cursor = absolute_start + end + close.len();
        } else {
            cursor = input.len();
            break;
        }
    }
    output.push_str(&input[cursor..]);
    output
}

fn strip_event_handlers(input: &str) -> String {
    let mut output = String::with_capacity(input.len());
    let mut chars = input.chars().peekable();
    while let Some(char) = chars.next() {
        if char.is_whitespace() && matches!(chars.peek(), Some('o' | 'O')) {
            let mut lookahead = String::new();
            while let Some(next) = chars.peek() {
                if *next == '=' || next.is_whitespace() {
                    break;
                }
                lookahead.push(*next);
                chars.next();
            }
            if lookahead.to_ascii_lowercase().starts_with("on") {
                while let Some(next) = chars.next() {
                    if next == '"' || next == '\'' {
                        let quote = next;
                        for quoted in chars.by_ref() {
                            if quoted == quote {
                                break;
                            }
                        }
                        break;
                    }
                    if next == '>' {
                        output.push('>');
                        break;
                    }
                }
            } else {
                output.push(char);
                output.push_str(&lookahead);
            }
        } else {
            output.push(char);
        }
    }
    output
}

fn strip_dangerous_url_values(input: &str) -> String {
    let mut output = input.to_string();
    for attribute in ["href=", "src=", "xlink:href="] {
        output = strip_dangerous_url_attribute(&output, attribute);
    }
    output
}

fn strip_dangerous_url_attribute(input: &str, attribute: &str) -> String {
    let mut output = String::with_capacity(input.len());
    let mut cursor = 0;
    let lower = input.to_ascii_lowercase();
    let attribute_lower = attribute.to_ascii_lowercase();

    while let Some(relative_start) = lower[cursor..].find(&attribute_lower) {
        let start = cursor + relative_start;
        output.push_str(&input[cursor..start]);

        let value_start = start + attribute.len();
        let Some(quote) = input[value_start..].chars().next() else {
            output.push_str(&input[start..value_start]);
            cursor = value_start;
            continue;
        };

        if quote != '"' && quote != '\'' {
            output.push_str(&input[start..value_start]);
            cursor = value_start;
            continue;
        }

        let content_start = value_start + quote.len_utf8();
        let Some(relative_end) = input[content_start..].find(quote) else {
            output.push_str(&input[start..]);
            cursor = input.len();
            break;
        };
        let content_end = content_start + relative_end;
        let value = input[content_start..content_end]
            .trim_start()
            .to_ascii_lowercase();

        if value.starts_with("javascript:") {
            cursor = content_end + quote.len_utf8();
        } else {
            output.push_str(&input[start..content_end + quote.len_utf8()]);
            cursor = content_end + quote.len_utf8();
        }
    }

    output.push_str(&input[cursor..]);
    output
}

#[cfg(test)]
mod tests {
    use super::sanitize_xhtml;

    #[test]
    fn sanitize_xhtml_removes_scripts_and_inline_event_handlers() {
        let html = r#"<body><h1 onclick="alert(1)">Titulo</h1><script>alert(2)</script></body>"#;

        let sanitized = sanitize_xhtml(html);

        assert!(!sanitized.contains("<script>"));
        assert!(!sanitized.contains("onclick"));
        assert!(sanitized.contains("Titulo"));
    }

    #[test]
    fn sanitize_xhtml_removes_embedded_active_content() {
        let html = r#"
            <body>
              <iframe src="https://example.com"></iframe>
              <object data="x"></object>
              <embed src="x"></embed>
              <svg><script>alert(1)</script></svg>
              <a href="javascript:alert(1)">bad</a>
              <img src="javascript:alert(2)" onerror="alert(3)" />
            </body>
        "#;

        let sanitized = sanitize_xhtml(html);
        let lower = sanitized.to_ascii_lowercase();

        assert!(!lower.contains("<iframe"));
        assert!(!lower.contains("<object"));
        assert!(!lower.contains("<embed"));
        assert!(!lower.contains("<script"));
        assert!(!lower.contains("javascript:"));
        assert!(!lower.contains("onerror"));
    }
}
