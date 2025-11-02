// Ensure ol.li-marker-gap honors the HTML start attribute by setting counter-reset
(function () {
    document.addEventListener('DOMContentLoaded', function () {
        // handle start attribute for counter-reset
        document.querySelectorAll('ol.li-marker-gap[start]').forEach(function (ol) {
            const s = parseInt(ol.getAttribute('start'), 10);
            if (!Number.isNaN(s)) {
                // CSS counter-reset should be start-1 so first item becomes start
                ol.style.counterReset = 'li ' + (s - 1);
            }
        });

        // propagate data-prefix on the <ol> into the CSS variable --marker-prefix
        // so `data-prefix="..."` placed on the ol will be used by the li::before content
        document.querySelectorAll('ol.li-marker-gap[data-prefix]').forEach(function (ol) {
            const p = ol.getAttribute('data-prefix') || '';
            // write it as-is into the CSS variable; no extra quotes
            try { ol.style.setProperty('--marker-prefix', p); } catch (e) { /* ignore */ }
        });

        // compute per-<li> marker text and set as data-marker attribute
        // This avoids cross-browser counter() rendering issues and makes data-prefix reliable.
        function numberToThai(n) {
            const digits = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
            return String(n).split('').map(ch => digits[ch] || ch).join('');
        }

        const thaiAlpha = ['ก', 'ข', 'ค', 'ง', 'จ', 'ฉ', 'ช', 'ซ', 'ฌ', 'ญ', 'ฎ', 'ฏ', 'ฐ', 'ฑ', 'ฒ', 'ณ', 'ด', 'ต', 'ถ', 'ท', 'ธ', 'น', 'บ', 'ป', 'ผ', 'ฝ', 'พ', 'ฟ', 'ภ', 'ม', 'ย', 'ร', 'ล', 'ว', 'ศ', 'ษ', 'ส', 'ห', 'ฬ', 'อ', 'ฮ'];

        document.querySelectorAll('ol.li-marker-gap').forEach(function (ol) {
            // determine start value; default 1
            const sAttr = parseInt(ol.getAttribute('start'), 10);
            const start = (!Number.isNaN(sAttr) && sAttr > 0) ? sAttr : 1;
            const prefix = ol.getAttribute('data-prefix') || ol.style.getPropertyValue('--marker-prefix') || '';
            const isAlpha = ol.classList.contains('alpha') || ol.classList.contains('thai-alphabetic');
            const noDot = ol.classList.contains('no-dot');

            // iterate direct li children
            const children = Array.prototype.filter.call(ol.children, function (ch) { return ch.tagName === 'LI'; });
            children.forEach(function (li, idx) {
                const value = start + idx;
                let marker = '';
                if (isAlpha) {
                    const sym = thaiAlpha[(value - 1) % thaiAlpha.length] || String(value);
                    // add a dot after alphabetic marker so it appears like 'ก.'
                    marker = prefix + sym + '.';
                } else {
                    // numeric -> convert to thai digits
                    marker = prefix + numberToThai(value);
                }

                // if ol has no-dot, remove trailing dot characters from marker
                if (noDot) {
                    marker = marker.replace(/\.+$/, '');
                }

                // assign as attribute used by CSS ::before
                li.setAttribute('data-marker', marker);
            });
        });
    });
})();

// Toggle all answers visibility

let allVisible = false;

function toggleAllAnswers() {
    const wrappers = document.querySelectorAll('.answer-wrapper');
    const button = document.querySelector('.toggle-all-btn');

    allVisible = !allVisible;

    wrappers.forEach(el => {
        el.style.display = allVisible ? 'block' : 'none';
    });

    button.textContent = allVisible ? 'ซ่อนคำตอบ' : 'แสดงคำตอบ';
}

// แบบที่ให้แสดงคำตอบทั้งหมดเมื่อโหลดหน้า ต้องไปแก้ไข css class .answer-wrapper แสดงเป็น display: none;ด้วย
//   let allVisible = true;

//   function toggleAllAnswers() {
//     const wrappers = document.querySelectorAll('.answer-wrapper');
//     const button = document.querySelector('.toggle-all-btn');

//     allVisible = !allVisible;

//     wrappers.forEach(el => {
//       el.style.display = allVisible ? 'block' : 'none';
//     });

//     button.textContent = allVisible ? 'ซ่อนคำตอบ' : 'แสดงคำตอบ';
//   }

//   // เรียกใช้ทันทีเมื่อโหลดหน้า
//   window.addEventListener('DOMContentLoaded', () => {
//     const wrappers = document.querySelectorAll('.answer-wrapper');
//     wrappers.forEach(el => {
//       el.style.display = 'block';
//     });

//     const button = document.querySelector('.toggle-all-btn');
//     button.textContent = 'ซ่อนคำตอบ';
//   });
