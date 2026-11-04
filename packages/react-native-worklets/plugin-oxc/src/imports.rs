pub fn can_forward_module_import(module_name: &str, forwardable: &[String]) -> bool {
    forwardable.iter().any(|forwardable_name| {
        module_name
            .strip_prefix(forwardable_name.as_str())
            .is_some_and(|rest| rest.is_empty() || rest.starts_with('/'))
    })
}

pub fn can_forward_relative_import(module_path: &str, relative_paths: &[String]) -> bool {
    if module_path.is_empty() {
        return false;
    }
    relative_paths
        .iter()
        .any(|relative_path| matches_filename_segment(module_path, relative_path))
}

fn matches_filename_segment(filename: &str, allowed_path: &str) -> bool {
    let allowed_segments: Vec<&str> = allowed_path.split('/').collect();
    let mut file_segments: Vec<&str> = filename.split('/').collect();
    if let Some(index) = file_segments.iter().rposition(|s| *s == "node_modules") {
        file_segments = file_segments.split_off(index + 1);
    }
    if allowed_segments.is_empty() {
        return false;
    }
    file_segments
        .windows(allowed_segments.len())
        .any(|window| window == allowed_segments.as_slice())
}
