import sys
import os
import re

def process(input_file, conn_file, schema_file, out_file):
    with open(input_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    conn_funcs = ["get_content_database_path", "get_portable_data_dir", "get_content_connection"]
    schema_funcs = [
        "next_available_main_branch_code", "next_available_sub_branch_code",
        "ensure_standard_occupation_branch_exists", "install_standard_occupation_branch_guards",
        "is_protected_main_branch", "is_protected_sub_branch",
        "initialize_content_database", "seed_owner_units",
        "initialize_question_tables", "migrate_section_links_to_ref_children",
        "init_branch_protection_schema"
    ]
    
    conn_lines = []
    schema_lines = []
    main_lines = []
    
    # We will write constants to schema.rs manually inside the script for cleanliness
    # And we'll just remove them from main.
    
    in_function = False
    current_target = None
    buffer = []
    bracket_count = 0
    
    attr_buffer = []

    for i, line in enumerate(lines):
        # Handle constants removal (move to schema)
        if "const STANDARD_BRANCH_NAME" in line or "const STANDARD_BRANCH_PREFERRED_CODE" in line or "const STANDARD_SUB_BRANCH_PREFERRED_CODE" in line:
            schema_lines.append(line)
            continue
            
        stripped = line.strip()
        
        if in_function:
            buffer.append(line)
            bracket_count += line.count('{') - line.count('}')
            if bracket_count == 0:
                in_function = False
                if current_target == 'conn':
                    conn_lines.extend(buffer)
                elif current_target == 'schema':
                    schema_lines.extend(buffer)
                
                buffer = []
                current_target = None
            continue

        if stripped.startswith('///') or stripped.startswith('#['):
            attr_buffer.append(line)
            continue
            
        is_func_start = False
        target = None
        
        if stripped.startswith('fn ') or stripped.startswith('pub fn ') or stripped.startswith('pub(crate) fn '):
            func_name = stripped.split('(')[0].split()[-1]
            if func_name in conn_funcs:
                is_func_start = True
                target = 'conn'
            elif func_name in schema_funcs:
                is_func_start = True
                target = 'schema'
                
        if is_func_start:
            in_function = True
            current_target = target
            if attr_buffer:
                buffer.extend(attr_buffer)
                attr_buffer = []
            buffer.append(line)
            bracket_count += line.count('{') - line.count('}')
            # One-liner function? (Extremely rare here but safe check)
            if bracket_count == 0 and '{' in line and '}' in line:
                in_function = False
                if current_target == 'conn':
                    conn_lines.extend(buffer)
                elif current_target == 'schema':
                    schema_lines.extend(buffer)
                buffer = []
                current_target = None
            continue

        # If it wasn't a function, push attr_buffer to main
        if attr_buffer:
            main_lines.extend(attr_buffer)
            attr_buffer = []
            
        main_lines.append(line)
        
    if attr_buffer:
        main_lines.extend(attr_buffer)
        
    print(f"Extracted {len(conn_lines)} lines to connection.rs")
    print(f"Extracted {len(schema_lines)} lines to schema.rs")

    # connection.rs header
    conn_header = [
        "use rusqlite::{Connection, Result as SqlResult};\n",
        "use std::path::PathBuf;\n",
        "use tauri::api::path::app_data_dir;\n",
        "use tauri::Config;\n\n"
    ]
    
    # schema.rs header
    schema_header = [
        "use rusqlite::{params, Connection, OptionalExtension};\n",
        "use crate::logger;\n",
        "use super::*;\n\n",
    ]

    with open(conn_file, 'w', encoding='utf-8') as f:
        f.writelines(conn_header)
        f.writelines(conn_lines)

    with open(schema_file, 'w', encoding='utf-8') as f:
        f.writelines(schema_header)
        f.writelines(schema_lines)

    with open(out_file, 'w', encoding='utf-8') as f:
        f.writelines(main_lines)

if __name__ == '__main__':
    process(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4])
