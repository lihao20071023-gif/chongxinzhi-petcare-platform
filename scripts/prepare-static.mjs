import { copyFile, cp, mkdir } from 'node:fs/promises';

await mkdir('out', { recursive: true });
await copyFile('out/hospital/index.html', 'out/hospital.html');
await copyFile('out/developer/index.html', 'out/developer.html');
await copyFile('out/portal/index.html', 'out/portal.html');
await copyFile('out/portal-preserved/index.html', 'out/portal-preserved.html');
await copyFile('out/design/index.html', 'out/design.html');
await copyFile('out/design/owner/index.html', 'out/design-owner.html');
await copyFile('out/design/doctor/index.html', 'out/design-doctor.html');
await copyFile('out/design/admin/index.html', 'out/design-admin.html');
await cp('admin-web/out', 'out/admin', { recursive: true, force: true });

// Keep the portable folder used by the local preview and cross-computer handoff
// synchronized with every successful build. Existing files are overwritten;
// user data remains in browser storage and is not fabricated during this copy.
await mkdir('outputs/petcare-ai-butler-static', { recursive: true });
await cp('out', 'outputs/petcare-ai-butler-static', { recursive: true, force: true });
