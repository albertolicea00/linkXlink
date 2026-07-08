// INSTRUCTIONS:
// 1. Open WhatsApp Web and go to the specific chat or channel.
// 2. Open the Developer Tools (F12 or Right Click -> Inspect).
// 3. Go to the "Console" tab.
// 4. Copy ALL of this code and paste it there. Press Enter.
// 5. The script will AUTOMATICALLY SCROLL UP for you. Just sit back and watch!
// 6. Once it reaches the top (or whenever you want to stop), type in the console: stopScraping() and press Enter.
// 7. A single `whatsapp_dump.json` file will be downloaded.
// 8. Run `python3 scripts/2_unpack_web_dump.py --input ~/Downloads/whatsapp_dump.json` in your terminal to extract the images!

(async function() {
    window.scrapedData = window.scrapedData || {};
    window.isScraping = true;
    
    function extractPhone(text, author) {
        if (!text) text = "";
        if (!author) author = "";
        
        const urlPattern = /(?:https?:\/\/|www\.|wa\.me\/|api\.whatsapp\.com\/)[a-zA-Z0-9\-\.\_\~\:\/\?\#\[\]\@\!\$\&\'\(\)\*\+\,\;\=\%]+/i;
        let match = text.match(urlPattern);
        if (match) {
            let num = match[0].replace(/[^\d]/g, '');
            if (num) return '+' + num;
        }
        
        match = text.match(/\+?\d{8,15}/);
        if (match) {
            let num = match[0].replace(/[^\d]/g, '');
            if (num) return '+' + num;
        }
        
        let numAuthor = author.replace(/[^\d]/g, '');
        if (numAuthor && numAuthor.length >= 8) {
            return '+' + numAuthor;
        }
        return null;
    }

    function cleanDescription(text) {
        if (!text) return { description: "", links: [] };
        let links = [];
        const urlPattern = /(?:https?:\/\/|www\.|wa\.me\/|api\.whatsapp\.com\/)[a-zA-Z0-9\-\.\_\~\:\/\?\#\[\]\@\!\$\&\'\(\)\*\+\,\;\=\%]+/gi;
        let match;
        while ((match = urlPattern.exec(text)) !== null) {
            links.push(match[0]);
        }
        let desc = text.replace(urlPattern, '');
        desc = desc.replace(/\+?[\d][\d\s\-]{7,15}/g, '');
        desc = desc.replace(/[\u200e\u200f]/g, '').trim();
        desc = desc.replace(/\s+/g, ' ');
        return { description: desc, links };
    }

    async function blobToBase64(blobUrl) {
        try {
            let response = await fetch(blobUrl);
            let blob = await response.blob();
            // Skip videos
            if (blob.type.includes('video')) return null;
            
            return await new Promise((resolve) => {
                let reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            return null;
        }
    }

    console.log("🚀 Extraction started! scroll UP to download more content.");
    console.log("🛑 When finished, type in the console: stopScraping()");

    window.scrapingInterval = setInterval(async () => {
        if (!window.isScraping) return;
        
        let messages = document.querySelectorAll('[role="row"]');
        
        // --- AUTO SCROLL UP ---
        if (messages.length > 0) {
            // Scroll to the top-most rendered message to trigger loading older messages
            messages[0].scrollIntoView({ behavior: "smooth", block: "start" });
        }
        
        for (let msg of messages) {
            let copyable = msg.querySelector('.copyable-text[data-pre-plain-text]');
            if (!copyable) continue;
            
            let preText = copyable.getAttribute('data-pre-plain-text');
            let metaMatch = preText.match(/\[(.*?)\] (.*?):/);
            let dateStr = metaMatch ? metaMatch[1].trim() : "";
            let author = metaMatch ? metaMatch[2].trim() : "";
            
            // Look for blob URLs (loaded, high-quality images)
            let img = msg.querySelector('img[src^="blob:"]');
            if (!img) continue;
            
            // Unique identifier for message
            let idDiv = msg.querySelector('div[data-id]');
            let msgId = idDiv ? idDiv.getAttribute('data-id') : (dateStr + author);
            
            if (window.scrapedData[msgId]) continue; // Already processed
            
            let textElements = msg.querySelectorAll('span.selectable-text.copyable-text');
            let text = "";
            if (textElements.length > 0) {
                text = textElements[textElements.length - 1].innerText;
            }
            
            let phone = extractPhone(text, author);
            if (!phone) continue;
            
            let { description, links } = cleanDescription(text);
            
            let b64 = await blobToBase64(img.src);
            if (!b64) continue;
            
            let timestamp = Date.now() + Math.floor(Math.random() * 10000);
            let imageFilename = `${phone}_${timestamp}.webp`;
            
            window.scrapedData[msgId] = {
                phone: phone,
                entry: {
                    key: phone,
                    phone: phone,
                    imageRef: imageFilename,
                    description: description,
                    links: links,
                    date: dateStr,
                    source: "WhatsApp Web DevTools"
                },
                base64: b64
            };
            
            console.log(`✅ Extracted: ${phone} (${Object.keys(window.scrapedData).length} total)`);
        }
    }, 1500); // Increased interval slightly to give images time to load when auto-scrolling

    window.stopScraping = async function() {
        window.isScraping = false;
        clearInterval(window.scrapingInterval);
        console.log("🛑 Scraping stopped. Generating JSON Dump... Please wait.");
        
        let dumpList = [];
        let uniquePhones = new Set();
        
        for (let id in window.scrapedData) {
            let item = window.scrapedData[id];
            dumpList.push(item);
            uniquePhones.add(item.phone);
        }
        
        let jsonString = JSON.stringify(dumpList, null, 2);
        let blob = new Blob([jsonString], {type: "application/json"});
        
        let a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "whatsapp_dump.json";
        a.click();
        
        console.log(`🎉 Success! Downloaded whatsapp_dump.json with ${uniquePhones.size} unique contacts.`);
        console.log(`👉 Now run the python script in your terminal to unpack the images!`);
    };
})();
