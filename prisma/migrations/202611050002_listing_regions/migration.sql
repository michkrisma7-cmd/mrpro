-- Add optional region fields; keep existing definitions and listing JSON intact.
INSERT INTO "PropertyField" (id,key,name,type,options,required,"showInForm","showOnCard","showOnDetail","cardLabel",position)
VALUES
 ('region-provinsi','provinsi','Provinsi','TEXT',ARRAY[]::text[],false,true,true,true,'',20),
 ('region-kota','kota_kabupaten','Kabupaten/Kota','TEXT',ARRAY[]::text[],false,true,true,true,'',21),
 ('region-kecamatan','kecamatan','Kecamatan','TEXT',ARRAY[]::text[],false,true,true,true,'',22),
 ('region-desa','kelurahan_desa','Desa/Kelurahan','TEXT',ARRAY[]::text[],false,true,true,true,'',23)
ON CONFLICT (key) DO NOTHING;
