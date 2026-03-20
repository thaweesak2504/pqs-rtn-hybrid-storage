// Debug script: Test branch usage detection
// Run this in browser console when app is open

async function debugBranchUsage() {
    const { invoke } = window.__TAURI__.tauri;
    
    console.log('=== DEBUG: Inspecting activeSubQuestions Metadata ===');
    
    try {
        // Get sample metadata
        const metadata = await invoke('debug_get_active_subquestions_metadata');
        console.log(`Found ${metadata.length} questions with activeSubQuestions`);
        
        metadata.forEach((json, index) => {
            const parsed = JSON.parse(json);
            console.log(`\nQuestion ${index + 1}:`);
            console.log('  activeSubQuestions:', parsed.activeSubQuestions);
            
            if (parsed.activeSubQuestions && parsed.activeSubQuestions.length > 0) {
                const firstCode = parsed.activeSubQuestions[0];
                console.log('  First code:', firstCode);
                console.log('  Code type:', typeof firstCode);
                
                // Extract branch code from first code
                const parts = firstCode.split('-');
                if (parts.length >= 2) {
                    console.log('  Extracted branch code:', parts[0]);
                }
            }
        });
        
        // Test check_branch_usage_global with a real branch code
        console.log('\n=== Testing check_branch_usage_global ===');
        
        // Try with branch code "1"
        const report1 = await invoke('check_branch_usage_global', { branchCode: '1' });
        console.log('Branch "1" usage report:', report1);
        
        // Try with branch code "2"
        const report2 = await invoke('check_branch_usage_global', { branchCode: '2' });
        console.log('Branch "2" usage report:', report2);
        
    } catch (err) {
        console.error('Error:', err);
    }
}

// Run the debug
debugBranchUsage();
