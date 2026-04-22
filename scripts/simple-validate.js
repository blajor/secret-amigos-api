const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken');
const { getIcalObjectInstance } = require('../utils/ical');

function line(msg) {
    console.log(msg);
}

async function checkJwt() {
    const secret = process.env.ACCESS_TOKEN_SECRET;
    if (!secret) {
        return {
            name: 'JWT sign/verify',
            ok: true,
            detail: 'Skipped (ACCESS_TOKEN_SECRET not set)'
        };
    }

    try {
        const payload = {
            eventid: 'event-test',
            participantid: 'participant-test',
            email: 'participant@example.com'
        };

        const token = jwt.sign(payload, secret);
        const decoded = jwt.verify(token, secret);

        if (!decoded || decoded.eventid !== payload.eventid) {
            return {
                name: 'JWT sign/verify',
                ok: false,
                detail: 'Decoded payload mismatch'
            };
        }

        return {
            name: 'JWT sign/verify',
            ok: true,
            detail: 'Token generated and verified'
        };
    } catch (error) {
        return {
            name: 'JWT sign/verify',
            ok: false,
            detail: error.message
        };
    }
}

function checkIcal() {
    try {
        if (!process.env.MAIL_USER) {
            process.env.MAIL_USER = 'noreply@example.com';
        }

        const cal = getIcalObjectInstance(
            new Date().toISOString(),
            'Validation Event',
            'Simple validation event',
            'Validation Location'
        );
        const content = cal.toString();

        if (!content.includes('BEGIN:VCALENDAR') || !content.includes('END:VCALENDAR')) {
            return {
                name: 'iCal generation',
                ok: false,
                detail: 'Generated content is not a valid VCALENDAR envelope'
            };
        }

        return {
            name: 'iCal generation',
            ok: true,
            detail: 'Calendar payload generated'
        };
    } catch (error) {
        return {
            name: 'iCal generation',
            ok: false,
            detail: error.message
        };
    }
}

async function checkMongo() {
    const uri = process.env.DB_URI;
    const dbName = process.env.DB_NAME;

    if (!uri || !dbName) {
        return {
            name: 'MongoDB ping',
            ok: true,
            detail: 'Skipped (DB_URI/DB_NAME not set)'
        };
    }

    let client;
    try {
        client = await MongoClient.connect(uri, {
            maxPoolSize: 2,
            serverSelectionTimeoutMS: 4000
        });

        const db = client.db(dbName);
        await db.command({ ping: 1 });

        return {
            name: 'MongoDB ping',
            ok: true,
            detail: `Connected and pinged database '${dbName}'`
        };
    } catch (error) {
        return {
            name: 'MongoDB ping',
            ok: false,
            detail: error.message
        };
    } finally {
        if (client) {
            await client.close();
        }
    }
}

async function main() {
    line('Simple dependency smoke validation');
    line('-----------------------------------');

    const checks = [];
    checks.push(await checkJwt());
    checks.push(checkIcal());
    checks.push(await checkMongo());

    let failed = 0;
    for (const check of checks) {
        const icon = check.ok ? '[PASS]' : '[FAIL]';
        line(`${icon} ${check.name}: ${check.detail}`);
        if (!check.ok) {
            failed += 1;
        }
    }

    line('-----------------------------------');
    if (failed > 0) {
        line(`Validation completed with ${failed} failing check(s).`);
        process.exit(1);
    }

    line('Validation passed.');
}

main().catch((error) => {
    console.error('[FAIL] Unexpected validation error:', error);
    process.exit(1);
});
