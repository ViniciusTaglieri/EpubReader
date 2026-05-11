pub fn sanitize_xhtml(input: &str) -> String {
    let without_scripts = strip_element(input, "script");
    strip_event_handlers(&without_scripts)
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
}
