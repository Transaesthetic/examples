"""
An example of what a company can do with all the data they hold if only
they tried just a little bit.

BT have data on telephone exchanges in the UK that either do or soon
will offer super-fast broadband.  They provide this data in PDFs, Excel
spreadsheets, or Word documents -- the data being the name, id, and
local authority of each exchange and the date it will offer super-fast
broadband (or "Now" if it already does).

And that's it.  How disappointing.  Why not offer RSS -- or better yet,
GeoRSS?  I want this on a map, damn it!

This script takes the data contained within the Excel spreadsheets and
saves each exchange and its geographic coverage as an entry in a GeoRSS
file.  It also saves HTML files that can display the GeoRSS data on a
map.  This is just one of the few things BT could have done with a few
hours and an interested programmer.

You can run the script from the command line if you have Python 2.4 or
greater:

    python exchanges.py

HTML and Atom files will appear in the current directory.  The script
depends on the ``simplejson`` (or ``json``) package, which you probably
have, and the ``xlrd`` package, which you probably don't.  To install
the latter with pip try:

    pip install xlrd

Otherwise follow instructions here:

    http://www.lexicon.net/sjmachin/xlrd.htm

Note that Google Maps can't load local GeoRSS files -- they need to be
on a web server somewhere -- so if you want to view the HTML files
you'll need to upload the HTML and GeoRSS data.
"""


import datetime
try:
    import simplejson as json
except ImportError:
    import json
from urllib import urlopen

import xlrd


# All spreadsheets on the BT Openreach site use a this URL.
BASE_EXCEL_URL = "http://www.openreach.co.uk/orpg/home/products/super-"\
    "fastfibreaccess/downloads/sffa_exchange_lists/%s.xls"
# All spreadsheets; tuples are title of GeoRSS/HTML and filename slug.
EXCEL_SPREADSHEETS = (
    ("Exchanges with super-fast broadband available now", "accepting_orders"),
    ("Exchanges with super-fast broadband available soon", "coming_soon"),
    ("Exchanges with super-fast broadband available eventually",
        "future_exchanges")
)
# Data for an exchange geographical coverage available here.
EXCHANGE_BOUNDS_URL = "http://www.samknows.com/broadband/index.php/map/"\
    "getExchangeBoundsJson?olo=%s"
# Template for a GeoRSS documents.
ATOM_DOCUMENT_TEMPLATE = """<feed xmlns="http://www.w3.org/2005/Atom"
        xmlns:georss="http://www.georss.org/georss">
    <id>uri:flother.com/blog/2011/broadband-telephone-exchanges/</id>
    <title>%s</title>
    <updated>%s</updated>
%s
</feed>
"""
# Template for an individual Atom entry (that is, individual exchanges).
ATOM_ENTRY_TEMPLATE = """    <entry>
        <id>tag:flother.com/blog/2011/broadband-telephone-exchanges,%s</id>
        <title>%s</title>
        <updated>%s</updated>
        <georss:polygon>%s</georss:polygon>
    </entry>"""
# Used in the Atom <updated/> element.
CURRENT_TIME = datetime.datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ")
# Title for the HTML file that contains all the exchanges, regardless of when
# they will support super-fast broadband.
ALL_DATA_HTML_TITLE = "Exchanges with super-fast broadband available now, "\
    "soon, or sometime in the future"
# Centre point of the UK, used for centring the map.
UK_MIDPOINT = (54.00366, -2.547855)


def save_atom_files():
    """
    Takes Excel spreadsheets from a BT web site that contain data on
    telephone exchanges that do, or soon will, support super-fast
    broadband, and converts it into GeoRSS documents.  HTML pages are
    also created so that the GeoRSS data can be viewed on a map.
    """
    all_exchanges = []  # This will hold all exchange data, from all files.
    # Grab the HTML template that will be used to write a file for each GeoRSS
    # document so it can be viewed on a map.
    t = open("template.html", "r")
    template = t.read()
    t.close()
    # Open each spreadsheet in turn, taking the title of the eventual GeoRSS
    # document and the slug that completes the full URL for the Excel
    # spreadsheet from the EXCEL_SPREADSHEETS tuple of tuples.
    for title, slug in EXCEL_SPREADSHEETS:
        spreadsheet_exchanges = []
        # Download the data and open it as an Excel spreadsheet.
        spreadsheet_contents = urlopen(BASE_EXCEL_URL % slug).read()
        spreadsheet = xlrd.open_workbook(file_contents=spreadsheet_contents)
        # There's only one sheet with data, the first.
        sheet = spreadsheet.sheet_by_index(0)
        # The first row are the headers.  Strip any trailing whitespace and
        # lower-case them all to normalise them a little.
        headers = [h.lower().strip() for h in sheet.row_values(0)]
        # Find the column that contains the exchange names.
        exchange_name_column = headers.index("exchange name")
        # Find the column that contains the exchange ids; "exchange" is
        # misspelt in some of the spreadsheets.
        try:
            exchange_id_column = headers.index("echnage id (sauid)")
        except ValueError:
            exchange_id_column = headers.index("exchange id (sauid)")
        # Find the column that contains the date the exchange will be accepting
        # orders; in the case of those already accepting orders, look for the
        # column that contains "Now".
        try:
            exchange_date_column = headers.index("estimated service "\
                "availability date (c-rfs)")
        except ValueError:
            exchange_date_column = headers.index("accepting orders")
        # Loop through all the non-header rows to get the exchange data.
        for row_number in range(1, sheet.nrows):
            row_values = sheet.row_values(row_number)
            # Get the date and see if it's a year (in which case it's an
            # estimate for when the exchange should be accepting orders), a
            # particular date (then it's when BT plan on accepting orders), or
            # the word "Now", in which case the exchange is super-fast
            # broadband ready.
            exchange_date = row_values[exchange_date_column]
            exchange_id = row_values[exchange_id_column]
            exchange_name = row_values[exchange_name_column]
            try:
                exchange_date = int(exchange_date)
                if exchange_date > 3000:  # Year.
                    exchange_date = (datetime.date(1899, 12, 30) +
                        datetime.timedelta(days=exchange_date)).strftime(
                        "%b %Y")
            except ValueError:
                pass  # "Now".
            # Get the boundaries of the exchange's coverage and covert them
            # into a simple GeoRSS polyline string.  This uses a fantastic but
            # undocumented JSON HTTP request available from SamKnows
            # (http://www.samknows.com/broadband/exchange_mapping).
            bounds = urlopen(EXCHANGE_BOUNDS_URL % exchange_id).read()
            points = " ".join(["%s %s" % (point["lat"], point["lng"]) for point
                in json.loads(bounds)["points"]])
            # Put the exchange name, exchange id, current time, and polyline
            # string into an Atom entry element.
            spreadsheet_exchanges.append(ATOM_ENTRY_TEMPLATE % (exchange_id,
                exchange_name, CURRENT_TIME, points))
        # Write the exchange data from this particular spreadsheet into a
        # GeoRSS document.
        f = open("%s.atom" % slug, "w")
        f.write(ATOM_DOCUMENT_TEMPLATE % (title, CURRENT_TIME,
            "\n".join(spreadsheet_exchanges)))
        f.close()
        # Write an HTML page that can be used to view this GeoRSS on a map.
        spreadsheet_template = template % (title, UK_MIDPOINT, slug,
            CURRENT_TIME)
        f = open("%s.html" % slug, "w")
        f.write(spreadsheet_template)
        f.close()
        # Add this spreadsheet's data to the list of all spreadsheet data.
        all_exchanges += spreadsheet_exchanges
    # As we have all the data we may as well create a final GeoRSS document
    # that contains all the spreadsheets' data combined.
    f = open("all.atom", "w")
    f.write(ATOM_DOCUMENT_TEMPLATE % (title, CURRENT_TIME,
        "\n".join(all_exchanges)))
    f.close()
    # And lastly, write a final HTML file that will display all the data on one
    # map.
    all_exchange_template = template % (ALL_DATA_HTML_TITLE, UK_MIDPOINT,
        "all", CURRENT_TIME)
    f = open("all.html", "w")
    f.write(all_exchange_template)
    f.close()


if __name__ == "__main__":
    save_atom_files()
