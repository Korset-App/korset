# Laboratory transport extension

This is a transport-only laboratory artifact, not the complete store connector.
It has no product adapter, installation UI, persistent queue, settings storage, or scheduler.
Do not install it in a partner's database as a working synchronization product.

The metadata was loaded, checked and packaged by educational platform 8.5.1.1150.
Compatibility mode is 8.5.1; support for older platforms and Kazakhstan configurations has not been verified.
The module is a native extension object. The Russian language is adopted from the laboratory main configuration.

The canonical BSL source is `integrations/onec/KorsetTransport.bsl`.
The build script copies it into generated source before compiling, so it is not duplicated here.

From the repository root, with a configured isolated file database already present at `scratch/onec-lab/build`:

```powershell
powershell -NoProfile -File scripts/build-onec-transport.ps1
```

The output is `scratch/onec-lab/KorsetTransport-lab.cfe` with separate load, check and package logs.
The script targets only that laboratory database and does not modify the user's UNF demonstration database.
Passing compilation does not verify HTTP execution, source extraction, recovery, installation in UNF, or production synchronization.
