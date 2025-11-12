import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('Starting Quran data import...');

        // Fetch complete Quran data from API (all 114 surahs)
        const response = await fetch('https://api.alquran.cloud/v1/quran/quran-uthmani');
        
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();

        if (!data.data || !data.data.surahs) {
            throw new Error('Invalid Quran data structure');
        }

        let importedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        
        console.log(`Processing ${data.data.surahs.length} surahs...`);
        
        for (const surah of data.data.surahs) {
            console.log(`Processing Surah ${surah.number}: ${surah.name} (${surah.ayahs.length} verses)`);
            
            for (const ayah of surah.ayahs) {
                try {
                    // Check if verse already exists
                    const existing = await base44.asServiceRole.entities.QuranVerse.filter({
                        surah_number: surah.number,
                        verse_number: ayah.numberInSurah
                    });

                    if (existing.length === 0) {
                        await base44.asServiceRole.entities.QuranVerse.create({
                            surah_number: surah.number,
                            surah_name: surah.name,
                            verse_number: ayah.numberInSurah,
                            verse_text: ayah.text,
                            verse_text_simple: ayah.text
                        });
                        importedCount++;
                        
                        // Log progress every 100 verses
                        if (importedCount % 100 === 0) {
                            console.log(`Progress: ${importedCount} verses imported`);
                        }
                    } else {
                        skippedCount++;
                    }
                } catch (err) {
                    errorCount++;
                    console.error(`Error importing verse ${surah.number}:${ayah.numberInSurah}:`, err.message);
                    
                    // If too many errors, stop the import
                    if (errorCount > 50) {
                        throw new Error(`Too many errors (${errorCount}), stopping import`);
                    }
                }
            }
        }

        const successMessage = `✅ اكتمل الاستيراد!\n- تم استيراد ${importedCount} آية جديدة\n- تم تخطي ${skippedCount} آية موجودة\n- عدد الأخطاء: ${errorCount}`;

        console.log(successMessage);

        return Response.json({
            success: true,
            message: successMessage,
            total_surahs: data.data.surahs.length,
            imported_verses: importedCount,
            skipped_verses: skippedCount,
            errors: errorCount
        });
    } catch (error) {
        console.error('Fatal error importing Quran data:', error);
        return Response.json({ 
            error: error.message,
            success: false,
            message: `❌ فشل الاستيراد: ${error.message}`
        }, { status: 500 });
    }
});