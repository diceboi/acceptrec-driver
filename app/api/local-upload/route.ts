import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';

export async function PUT(req: Request) {
    const { searchParams } = new URL(req.url);
    const filename = searchParams.get('filename');
    
    if (!filename) {
        return new NextResponse("Filename required", { status: 400 });
    }

    // Security check: ensure filename doesn't contain '..' to prevent directory traversal
    if (filename.includes('..')) {
        return new NextResponse("Invalid filename", { status: 400 });
    }

    try {
        const buffer = Buffer.from(await req.arrayBuffer());
        
        // Define upload directory within public folder
        const publicDir = join(process.cwd(), 'public');
        const filePath = join(publicDir, filename);
        
        // Ensure the directory exists
        await mkdir(dirname(filePath), { recursive: true });
        
        await writeFile(filePath, buffer);
        
        return NextResponse.json({ success: true, path: filename });
    } catch (error) {
        console.error("Local upload failed", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
